import { randomBytes } from 'node:crypto'

export const WORKSPACE_COOKIE = 'rankora_workspace'

/**
 * Apply AI workspace ownership (Milestone 2 LIMITATION — no authentication exists).
 *
 * Until real user accounts are built, each browser gets a cryptographically random
 * workspace id stored ONLY in an httpOnly cookie. All Apply AI data (profile,
 * documents) is scoped to this workspace server-side:
 *
 *  - the token is never readable by JavaScript and never returned in API bodies
 *  - every request is authorized by matching the cookie against the data owner
 *  - lose the cookie → lose access to that workspace's data (documented trade-off)
 *
 * This is NOT authentication. Replacing it with real accounts + ownership checks
 * later requires only swapping workspace.ts getters — call sites are stable.
 */
export function createWorkspaceToken(): string {
  return randomBytes(32).toString('hex')
}

export function readWorkspaceToken(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null
  // Hex-only sanity check; never trust arbitrary cookie bytes.
  return /^[0-9a-f]{64}$/.test(cookieValue) ? cookieValue : null
}

export const workspaceCookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // one year; workspace data stays until cookie expiry
}
