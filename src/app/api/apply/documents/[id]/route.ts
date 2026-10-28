import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { WORKSPACE_COOKIE, readWorkspaceToken } from '@/lib/apply-ai/workspace'
import { deleteStoredFile } from '@/lib/apply-ai/storage'

async function requireWorkspace(): Promise<string | null> {
  const cookieStore = await cookies()
  return readWorkspaceToken(cookieStore.get(WORKSPACE_COOKIE)?.value)
}

/** Deletes a document (row + private file). Authorization: workspace owner only. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const workspaceId = await requireWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised' }, { status: 401 })
  }

  const { id } = await params
  const row = await prisma.uploadedDocument.findUnique({ where: { id: id } })

  // 404 both for unknown ids and other workspaces' documents (no existence leak).
  if (!row || row.workspaceId !== workspaceId || row.deletedAt) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  await prisma.uploadedDocument.update({
    where: { id: row.id },
    data: { deletedAt: new Date() },
  })
  await deleteStoredFile(workspaceId, row.storedName)

  return NextResponse.json({ deleted: true })
}

/** Updates the display label (used for 'OTHER' documents). */
const labelSchema = z.object({ displayLabel: z.string().min(1).max(80) })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const workspaceId = await requireWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised' }, { status: 401 })
  }

  const { id } = await params
  const row = await prisma.uploadedDocument.findUnique({ where: { id: id } })
  if (!row || row.workspaceId !== workspaceId || row.deletedAt) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Labels exist only for student-added 'OTHER' documents; core rows are named
  // by their fixed checklists.
  if (row.documentType !== 'OTHER') {
    return NextResponse.json(
      { error: 'Only other documents can be renamed.' },
      { status: 400 }
    )
  }

  let body: { displayLabel?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = labelSchema.safeParse({ displayLabel: body.displayLabel })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Label must be 1–80 characters' }, { status: 400 })
  }

  await prisma.uploadedDocument.update({
    where: { id: row.id },
    data: { displayLabel: parsed.data.displayLabel },
  })

  return NextResponse.json({ updated: true })
}
