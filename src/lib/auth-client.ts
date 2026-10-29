import { createAuthClient } from 'better-auth/react'

// Same-origin Better Auth client. All requests hit /api/auth/* through the
// catch-all route handler. No credentials or secrets are stored in client
// code — sessions ride only the library-managed httpOnly cookie.
export const authClient = createAuthClient()
