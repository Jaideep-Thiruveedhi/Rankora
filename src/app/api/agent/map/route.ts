import { NextRequest, NextResponse } from 'next/server'
import { agentMapRequestSchema, buildAgentFillPlan, persistAgentPlan } from '@/lib/agent/mapper'
import { resolveAgentSession } from '@/lib/agent/session'

/**
 * Extension detection → redacted fill plan. Requires a valid agent session;
 * field VALUES are never accepted here and never returned here — only field
 * descriptors (labels/options) come in and mapping decisions go out.
 */
export async function POST(request: NextRequest) {
  const session = await resolveAgentSession(request)
  if (!session) {
    return NextResponse.json(
      { error: 'Agent session missing or expired — reconnect the extension.', code: 'AGENT_SESSION_INVALID' },
      { status: 401 }
    )
  }

  const body = (await request.json().catch(() => null)) as unknown
  const parsed = agentMapRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Detection payload is malformed.', code: 'MALFORMED_DETECTION' },
      { status: 400 }
    )
  }

  const plan = await buildAgentFillPlan(parsed.data.fields)
  await persistAgentPlan(session.workspaceId, plan)

  return NextResponse.json({ plan })
}
