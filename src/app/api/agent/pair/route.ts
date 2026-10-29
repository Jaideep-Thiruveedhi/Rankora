import { NextRequest, NextResponse } from 'next/server'
import { clientKeyFromRequest, pairWithCode, rateLimitKey } from '@/lib/agent/session'

/**
 * Extension-side pairing exchange: a single-use, short-lived pairing code is
 * swapped for a scoped, expiring agent session token. This is the only
 * unauthenticated agent endpoint; it is rate-limited and never returns profile
 * data — only the session token for an already-authorised workspace.
 */
export async function POST(request: NextRequest) {
  if (!rateLimitKey('agent-pair:' + clientKeyFromRequest(request), 10, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many pairing attempts. Wait a minute and try again.', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null
  const attempt = await pairWithCode(body?.code)

  if (!attempt.ok) {
    return NextResponse.json({ error: attempt.error, code: attempt.code }, { status: attempt.status })
  }

  return NextResponse.json({
    token: attempt.token,
    expiresAt: attempt.expiresAt.toISOString(),
  })
}
