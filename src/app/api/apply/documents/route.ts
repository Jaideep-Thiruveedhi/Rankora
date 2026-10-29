import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireWorkspaceId } from '@/lib/apply-ai/workspace'
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  extensionForMime,
  saveDocumentBytes,
  deleteStoredFile,
  sniffMimeFromBytes,
} from '@/lib/apply-ai/storage'
import type { DocumentId, UploadedDocumentDTO } from '@/lib/apply-ai/types'

type DocumentRow = Awaited<ReturnType<typeof prisma.uploadedDocument.findUnique>>

function toDTO(row: DocumentRow): UploadedDocumentDTO {
  if (!row) throw new Error('Document row missing')
  return {
    id: row.id,
    documentType: row.documentType as DocumentId,
    displayLabel: row.displayLabel ?? null,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    versions: row.versions,
    createdAt: row.createdAt.toISOString(),
    replacedAt: row.replacedAt ? row.replacedAt.toISOString() : null,
  }
}

export async function GET() {
  const workspaceId = await requireWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised' }, { status: 401 })
  }

  const rows = await prisma.uploadedDocument.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: [{ documentType: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({ documents: rows.map(toDTO) })
}

const uploadSchema = z.object({
  documentType: z.enum([
    'PHOTO', 'SIGNATURE', 'CLASS10_MARKSHEET',
    'CLASS12_MARKSHEET', 'CATEGORY_CERTIFICATE', 'PWD_CERTIFICATE', 'OTHER',
  ]),
  // Only OTHER rows may carry a student-written label.
  displayLabel: z.string().min(1).max(80).optional(),
})

export async function POST(request: NextRequest) {
  const workspaceId = await requireWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload form data' }, { status: 400 })
  }

  const meta = uploadSchema.safeParse({
    documentType: form.get('documentType'),
    displayLabel: form.get('displayLabel') || undefined,
  })
  if (!meta.success) {
    return NextResponse.json(
      { error: "Unsupported document entry. Check the document type and, for 'Other document', the label." },
      { status: 400 }
    )
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Attach a file to upload' }, { status: 400 })
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.` },
      { status: 400 }
    )
  }

  const mimeType = file.type.toLowerCase()
  if (!ALLOWED_MIME_TYPES.includes(mimeType) || !extensionForMime(mimeType)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Accepted formats: JPEG image, PNG image, or PDF.' },
      { status: 400 }
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  // Trust bytes, not the client-declared Content-Type.
  const sniffedMime = sniffMimeFromBytes(bytes)
  if (!sniffedMime || !ALLOWED_MIME_TYPES.includes(sniffedMime)) {
    return NextResponse.json(
      { error: 'File content is not a valid JPEG, PNG or PDF document.' },
      { status: 400 }
    )
  }

  // Validate the OTHER-document label BEFORE writing anything to disk so a
  // rejected upload can never leave an orphan file in the storage root.
  if (meta.data.documentType === 'OTHER' && !meta.data.displayLabel) {
    return NextResponse.json(
      { error: 'Other documents need a short label (1–80 characters).' },
      { status: 400 }
    )
  }

  const originalName = file.name.split(/[\\/]/).pop()?.slice(0, 200) || 'document'
  const storedName = await saveDocumentBytes(workspaceId, sniffedMime, bytes)

  let row: DocumentRow
  if (meta.data.documentType === 'OTHER') {
    row = await prisma.uploadedDocument.create({
      data: {
        workspaceId,
        documentType: 'OTHER',
        displayLabel: meta.data.displayLabel,
        originalName,
        storedName,
        mimeType: sniffedMime,
        sizeBytes: bytes.length,
      },
    })
  } else {
    // Core doc types keep ONE active row each: replacement rewrites the file.
    const existing = await prisma.uploadedDocument.findFirst({
      where: { workspaceId, documentType: meta.data.documentType, deletedAt: null },
      select: { id: true, storedName: true },
    })

    row = existing
      ? await prisma.uploadedDocument.update({
          where: { id: existing.id },
          data: {
            originalName,
            storedName,
            mimeType: sniffedMime,
            sizeBytes: bytes.length,
            replacedAt: new Date(),
            versions: { increment: 1 },
          },
        })
      : await prisma.uploadedDocument.create({
          data: {
            workspaceId,
            documentType: meta.data.documentType,
            originalName,
            storedName,
            mimeType: sniffedMime,
            sizeBytes: bytes.length,
          },
        })

    if (existing) await deleteStoredFile(workspaceId, existing.storedName)
  }

  return NextResponse.json({ document: toDTO(row) }, { status: 201 })
}
