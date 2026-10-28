import type { ApplicationStatus, ProfileStatus } from '@/lib/apply-ai/types'

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  NOT_STARTED: {
    label: 'Not started',
    className: 'bg-secondary text-muted-foreground border border-border',
  },
  PREPARING: {
    label: 'Preparing',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  READY_FOR_REVIEW: {
    label: 'Ready for review',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ' + config.className}>
      <span className='w-1.5 h-1.5 rounded-full bg-current opacity-70' />
      {config.label}
    </span>
  )
}

const PROFILE_STATUS_CONFIG: Record<ProfileStatus, { label: string; className: string }> = {
  INCOMPLETE: {
    label: 'Incomplete',
    className: 'bg-secondary text-muted-foreground border border-border',
  },
  IN_PROGRESS: {
    label: 'In progress',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  COMPLETE: {
    label: 'Complete',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
}

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  const config = PROFILE_STATUS_CONFIG[status]
  return (
    <span className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ' + config.className}>
      <span className='w-1.5 h-1.5 rounded-full bg-current opacity-70' />
      {config.label}
    </span>
  )
}

export function UnverifiedBadge() {
  return (
    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground border border-border'>
      Unverified
    </span>
  )
}

export function DemoDataBadge() {
  return (
    <span
      title='Demonstration data entered by you — Rankora does not verify it and never invents values.'
      className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-accent/10 text-accent-foreground border border-accent/30'
    >
      Self-entered
    </span>
  )
}
