import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  WORKSPACE_COOKIE,
  createWorkspaceToken,
  readWorkspaceToken,
  workspaceCookieOptions,
} from '@/lib/apply-ai/workspace'

/**
 * Ensures an anonymous Apply AI workspace exists for this browser.
 * Idempotent; the token itself never leaves the httpOnly cookie.
 */
export async function POST() {
  const cookieStore = await cookies()
  const existing = readWorkspaceToken(cookieStore.get(WORKSPACE_COOKIE)?.value)

  const response = NextResponse.json({ workspace: existing ? 'existing' : 'created' })
  if (!existing) {
    cookieStore.set(WORKSPACE_COOKIE, createWorkspaceToken(), workspaceCookieOptions)
  }
  return response
}
