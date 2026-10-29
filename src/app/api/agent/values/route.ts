import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { resolveAgentSession } from '@/lib/agent/session'
import { resolveAgentValues } from '@/lib/agent/values'

const valuesRequestSchema = z.object({
  fields: z.array(z.string().min(1).max(40)).max(30),
})

/**
 * Approved-custom fields only: returns the concrete profile values for the
 * canonical fields the STUDENT approved in the fill plan. Requires a valid
 * agent session scoped to the paired workspace. Missing values are reported
 * as `missing` — the agent never invents data.
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
  const parsed = valuesRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Value request malformed.', code: 'MALFORMED_REQUEST' }, { status: 400 })
  }

  const result = await resolveAgentValues(session.workspaceId, parsed.data.fields)
  return NextResponse.json(result)
}
