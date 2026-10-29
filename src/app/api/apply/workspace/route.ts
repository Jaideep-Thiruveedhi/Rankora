import { NextResponse } from 'next/server'
import { ensureWorkspace } from '@/lib/apply-ai/workspace'

/**
 * Ensures a workspace exists for this browser/session. Milestone 2 anonymous
 * minting is preserved; signed-in users resolve or mint an account-owned
 * workspace instead (see ensureWorkspace). The token itself never leaves the
 * httpOnly cookie.
 */
export async function POST() {
  const workspace = await ensureWorkspace()
  return NextResponse.json({ workspace })
}
