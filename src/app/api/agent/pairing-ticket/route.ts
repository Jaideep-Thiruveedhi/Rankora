import { NextResponse } from 'next/server'
import { requireWorkspaceId } from '@/lib/apply-ai/workspace'
import { createAgentPairingTicket } from '@/lib/agent/session'

/**
 * Issues a single-use, 15-minute pairing ticket for the workspace THIS browser
 * currently resolves to (page-cookie path — the workspace cookie is read
 * server-side and never leaves this trust boundary).
 */
export async function POST() {
  const workspaceId = await requireWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised', code: 'NO_WORKSPACE' }, { status: 401 })
  }

  const ticket = await createAgentPairingTicket(workspaceId)
  return NextResponse.json({
    code: ticket.code,
    expiresAt: ticket.expiresAt.toISOString(),
  })
}
