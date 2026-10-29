import { NextResponse } from 'next/server'
import { claimWorkspaceFromCookie } from '@/lib/apply-ai/workspace'

/**
 * Explicit "Save my work" claim (Milestone 3). The signed-in user adopts the
 * workspace their browser cookie points at — possession of the cookie is the
 * proof. Conflicts (already owned by this or another account, concurrent
 * claim) are refused safely with 409; existing profile/document rows stay
 * untouched and simply become part of the claimed workspace.
 */
export async function POST() {
  const result = await claimWorkspaceFromCookie()

  if (result.ok) {
    return NextResponse.json({ workspace: 'owned', changed: result.changed })
  }

  return NextResponse.json(
    { error: result.error, code: result.code },
    { status: result.status }
  )
}
