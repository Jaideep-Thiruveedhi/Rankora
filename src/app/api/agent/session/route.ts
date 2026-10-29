import { NextResponse } from 'next/server'
import { resolveAgentSession } from '@/lib/agent/session'

/**
 * Extension token probe: lets the extension popup verify that its stored
 * session token is still valid without touching any student data.
 */
export async function GET(request: Request) {
  const session = await resolveAgentSession(request)
  if (!session) {
    return NextResponse.json(
      { valid: false, error: 'Agent session missing or expired.', code: 'AGENT_SESSION_INVALID' },
      { status: 401 }
    )
  }
  // Deliberately minimal: no workspace id, no profile data.
  return NextResponse.json({ valid: true })
}
