import { NextResponse } from 'next/server'
import { requireWorkspaceId } from '@/lib/apply-ai/workspace'
import { revokeAgentSessions } from '@/lib/agent/session'

/**
 * Page-side cancel control: revokes every live agent session of this
 * browser's workspace. The extension must re-pair with a fresh code afterwards.
 */
export async function POST() {
  const workspaceId = await requireWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised', code: 'NO_WORKSPACE' }, { status: 401 })
  }

  const revoked = await revokeAgentSessions(workspaceId)
  return NextResponse.json({ revoked })
}
