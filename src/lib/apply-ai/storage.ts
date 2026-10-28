import { createReadStream } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import path from 'node:path'

/**
 * Private document storage (Milestone 2 LIMITATION — local disk).
 *
 * Files are stored OUTSIDE the `public/` web directory (default
 * `<project>/storage/uploads`), are never listed by any public path, and are
 * served only through an authorized route handler. No external storage service
 * or credentials are invented; a cloud object store can replace this module
 * behind the same functions later.
 */

export function getStorageRoot(): string {
  return process.env.RANKORA_STORAGE_DIR ?? path.join(process.cwd(), 'storage', 'uploads')
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
}

export const ALLOWED_MIME_TYPES = Object.keys(MIME_EXTENSIONS)

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB, generous workspace limit

/**
 * Detects the real file type from magic bytes. Multipart "Content-Type" is
 * declared by the client and cannot be trusted, so acceptance is decided from
 * the bytes themselves (JPEG / PNG / PDF only).
 */
export function sniffMimeFromBytes(bytes: Buffer): string | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'application/pdf'
  }
  return null
}

function sanitizePathSegment(value: string): string {
  // Strip any path separators / traversal characters defensively.
  return path.basename(value.replace(/\\/g, '/'))
}

export function extensionForMime(mimeType: string): string | null {
  return MIME_EXTENSIONS[mimeType.toLowerCase()] ?? null
}

/** Saves bytes under a random filename inside the private storage root. */
export async function saveDocumentBytes(
  workspaceId: string,
  mimeType: string,
  bytes: Buffer
): Promise<string> {
  const ext = extensionForMime(mimeType)
  const storedName = sanitizePathSegment(`${randomUUID()}${ext ?? ''}`)
  const workspaceDir = path.join(/*turbopackIgnore: true*/ getStorageRoot(), sanitizePathSegment(workspaceId))
  await mkdir(workspaceDir, { recursive: true })
  const abs = resolveStoredPath(workspaceId, storedName)
  await writeFile(abs, bytes)
  return storedName
}

/** Resolves a stored filename to an absolute path strictly inside the root. */
export function resolveStoredPath(workspaceId: string, storedName: string): string {
  // The storage root is intentionally dynamic (RANKORA_STORAGE_DIR support);
  // opt out of Turbopack's whole-project tracing for this call.
  const root = path.resolve(/*turbopackIgnore: true*/ getStorageRoot())
  const abs = path.resolve(root, sanitizePathSegment(workspaceId), sanitizePathSegment(storedName))
  if (!abs.startsWith(root + path.sep)) {
    throw new Error('Invalid storage path')
  }
  return abs
}

/** Opens a stored file as a web ReadableStream for response streaming. */
export function openStoredFileAsStream(workspaceId: string, storedName: string): ReadableStream {
  const nodeStream = createReadStream(resolveStoredPath(workspaceId, storedName))
  return Readable.toWeb(nodeStream) as unknown as ReadableStream
}

export async function deleteStoredFile(workspaceId: string, storedName: string): Promise<void> {
  await unlink(resolveStoredPath(workspaceId, storedName)).catch(() => {
    // Missing files are not an error for cleanup purposes.
  })
}
