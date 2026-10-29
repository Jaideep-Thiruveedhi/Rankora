import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// Better Auth catch-all. Every core endpoint lives under /api/auth/*:
// sign-in, sign-up, get-session, sign-out, ... No other route is needed.
// Secrets stay server-side; the React client targets the same origin and
// authentication state travels only in the library-managed httpOnly cookie.
export const { GET, POST } = toNextJsHandler(auth)
