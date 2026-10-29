'use client'

import type { ProfileEvaluation } from '@/lib/apply-ai/requirements'
import { ProfileStatusBadge } from '@/components/apply/status-badge'

/**
 * Profile readiness for the agent page — reuses the server-evaluated
 * evaluation from the existing profile API (no duplicated readiness logic).
 */
export function AgentReadinessCard({
  evaluation,
  loading,
}: {
  evaluation: ProfileEvaluation | null
  loading: boolean
}) {
  if (loading || !evaluation) {
    return (
      <div className='bg-background border border-border rounded-2xl p-5'>
        <div className='h-4 w-40 bg-muted rounded animate-pulse mb-3' />
        <div className='h-3 w-64 bg-muted/70 rounded animate-pulse' />
      </div>
    )
  }

  const missing = evaluation.missingLabels

  return (
    <div className='bg-background border border-border rounded-2xl p-5'>
      <div className='flex items-center justify-between gap-3 mb-2'>
        <h2 className='text-base font-semibold text-foreground'>Student profile readiness</h2>
        <ProfileStatusBadge status={evaluation.status} />
      </div>
      <p className='text-xs text-muted-foreground mb-3'>
        {evaluation.completedSections} of {evaluation.totalSections} profile sections complete. The agent only
        proposes fields that are already saved in your profile — it never invents values.
      </p>

      {missing.length > 0 ? (
        <div className='bg-amber-50 border border-amber-200 rounded-xl p-3.5'>
          <p className='text-xs font-semibold text-amber-900 mb-2'>
            Missing information — forms asking for these stay unfilled until you add them:
          </p>
          <div className='flex flex-wrap gap-1.5'>
            {missing.map(label => (
              <span
                key={label}
                className='inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-amber-300 text-[11px] font-medium text-amber-900'
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className='bg-green-50 border border-green-200 rounded-xl p-3.5'>
          <p className='text-xs font-semibold text-green-800'>
            Every required profile field is saved — nothing will be invented to fill gaps.
          </p>
        </div>
      )}

      <p className='text-[11px] text-muted-foreground mt-3'>
        Add or fix details on the <a href='/apply/profile' className='text-primary hover:underline font-medium'>Profile page</a>.
      </p>
    </div>
  )
}
