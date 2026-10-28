import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { WORKSPACE_COOKIE, readWorkspaceToken } from '@/lib/apply-ai/workspace'
import { openStoredFileAsStream } from '@/lib/apply-ai/storage'

/**
 * Streams a stored document to its owner only (workspace cookie must match).
 *
 * Privacy properties:
 *  - files live outside /public and are reachable ONLY through this handler
 *  - the randomized on-disk filename is never exposed; ids are used instead
 *  - responses are `private, no-store` so intermediaries do not cache them
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const workspaceId = readWorkspaceToken(cookieStore.get(WORKSPACE_COOKIE)?.value)
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised' }, { status: 401 })
  }

  const { id } = await params
  const row = await prisma.uploadedDocument.findUnique({ where: { id: id } })
  if (!row || row.workspaceId !== workspaceId || row.deletedAt) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const webStream = openStoredFileAsStream(workspaceId, row.storedName)

  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': row.mimeType,
      'Content-Length': String(row.sizeBytes),
      'Content-Disposition': `inline; filename="document-${encodeURIComponent(row.id)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
