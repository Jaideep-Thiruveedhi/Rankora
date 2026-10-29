import { NextResponse } from 'next/server'
import { requireWorkspaceId } from '@/lib/apply-ai/workspace'
import { agentConnectionStateForWorkspace } from '@/lib/agent/session'

/**
 * Page-side connection state for /apply/agent: whether an agent session is
 * currently active for this browser's workspace and the plan the extension
 * last detected (labels + mapping decisions only — never student values).
 */
export async function GET() {
  const workspaceId = await requireWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised', code: 'NO_WORKSPACE' }, { status: 401 })
  }

  const state = await agentConnectionStateForWorkspace(workspaceId)
  return NextResponse.json(state)
}
