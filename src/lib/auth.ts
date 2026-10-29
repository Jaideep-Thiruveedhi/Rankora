import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/lib/prisma'

// Milestone 3 — core authentication only.
//  - Email/password (no OAuth, no 2FA, no email delivery plugins this milestone).
//  - Secret/base URL are read from BETTER_AUTH_SECRET / BETTER_AUTH_URL in .env
//    (never hardcoded, never committed).
//  - The adapter reuses the existing Prisma client; the generated models live in
//    prisma/schema.prisma and were added by `@better-auth/cli generate`.
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
})
