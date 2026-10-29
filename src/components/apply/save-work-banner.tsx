'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { useClaimWorkspace, type WorkspaceStatus } from '@/lib/apply-ai/api-client'

/**
 * Workspace ownership status banner (Milestone 3).
 *
 *  - claimable: the student is signed in but this browser still holds an
 *    unclaimed anonymous workspace — offers the explicit, one-click
 *    "Save my work" claim (server-side conflicts are explained in place).
 *  - unavailable: the workspace in this browser's cookie is claimed by an
 *    account whose session is not active right now — nothing is auto-merged
 *    or replaced; the student signs in to reach the data.
 *  - owned: signed in with an account-owned workspace — a slim confirmation.
 */
export function SaveWorkBanner({
  status,
  onSaved,
}: {
  status: WorkspaceStatus | null
  onSaved?: () => void
}) {
  const { data: session } = authClient.useSession()
  const claimMutation = useClaimWorkspace()
  const [saved, setSaved] = useState(false)

  if (status === 'claimable') {
    const account = session?.user?.name || session?.user?.email || 'your account'
    return (
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-green-50 border border-green-300 rounded-xl px-4 py-3'>
        <span className='text-lg' aria-hidden>🔐</span>
        <div className='flex-1'>
          <p className='text-xs text-green-900'>
            <strong className='font-semibold'>Signed in as {account}.</strong> Your profile and documents in this
            browser are still a browser-only workspace. They are not linked to your account yet.
          </p>
          {saved ? (
            <p className='mt-1 text-xs font-semibold text-green-700'>Saved — this workspace now belongs to your account.</p>
          ) : claimMutation.isError ? (
            <p className='mt-1 text-xs font-semibold text-red-700' role='alert'>
              {claimMutation.error.message}
            </p>
          ) : (
            <p className='mt-1 text-xs text-green-800'>
              Saving keeps everything exactly as it is and ties it to your account — you will reach it on any device
              after signing in.
            </p>
          )}
        </div>
        {saved ? (
          <span className='self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 rounded-lg'>
            Done
          </span>
        ) : (
          <button
            type='button'
            disabled={claimMutation.isPending}
            onClick={() => {
              claimMutation.mutate(undefined, {
                onSuccess: () => {
                  setSaved(true)
                  onSaved?.()
                },
              })
            }}
            className='self-start sm:self-auto px-4 py-2 text-xs font-semibold text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2'
          >
            {claimMutation.isPending && (
              <span className='w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin' aria-hidden />
            )}
            {claimMutation.isPending ? 'Saving…' : 'Save my work'}
          </button>
        )}
      </div>
    )
  }

  if (status === 'unavailable') {
    return (
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3'>
        <span className='text-lg' aria-hidden>🔒</span>
        <div className='flex-1'>
          <p className='text-xs text-amber-900'>
            <strong className='font-semibold'>This saved workspace belongs to an account.</strong> Its profile and
            documents are private to that account — nothing was changed or deleted. Sign in with the saving account
            to continue working on it.
          </p>
        </div>
        <Link
          href='/login'
          className='self-start sm:self-auto px-4 py-2 text-xs font-semibold text-amber-900 border border-amber-300 bg-white rounded-lg hover:bg-amber-100 transition-colors'
        >
          Sign in
        </Link>
      </div>
    )
  }

  if (status === 'owned') {
    const account = session?.user?.name || session?.user?.email || 'your account'
    return (
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-background border border-green-200 rounded-xl px-4 py-3'>
        <span className='text-lg' aria-hidden>✅</span>
        <p className='text-xs text-foreground flex-1'>
          <strong className='font-semibold'>Signed in as {account}</strong> — your profile and documents are saved to
          your account and follow you across devices.
        </p>
      </div>
    )
  }

  return null
}
