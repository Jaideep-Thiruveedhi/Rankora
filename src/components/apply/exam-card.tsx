import { OFFICIAL_SOURCE_NOTE } from '@/lib/apply-ai/exams'
import type { ApplicationStatus, ExamDefinition, ExamRequirement } from '@/lib/apply-ai/types'
import { StatusBadge } from './status-badge'

const CTA_LABELS = {
  NOT_STARTED: 'Begin preparation',
  PREPARING: 'Continue preparation',
  READY_FOR_REVIEW: 'Review application',
} as const

export function ExamCard({
  exam,
  requirement,
  status,
  active,
  onOpen,
}: {
  exam: ExamDefinition
  requirement: ExamRequirement
  status: ApplicationStatus
  active: boolean
  onOpen: () => void
}) {
  const unmet = requirement.items.filter(item => !item.met)
  const unmetSections = unmet.filter(item => item.kind === 'profile-section')
  const unmetDocs = unmet.filter(item => item.kind === 'document')
  const metPercent = requirement.totalCount > 0
    ? Math.round((requirement.metCount / requirement.totalCount) * 100)
    : 100

  return (
    <div
      className={'bg-background border rounded-xl p-5 sm:p-6 flex flex-col hover:shadow-lg transition-shadow ' +
        (active ? 'border-primary ring-2 ring-primary/20' : 'border-border')}
    >
      <div className='flex items-start justify-between gap-3 mb-4'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl'>
            {exam.icon}
          </div>
          <div>
            <h3 className='font-semibold text-foreground leading-tight'>{exam.name}</h3>
            <p className='text-xs text-muted-foreground mt-0.5'>{exam.organizer}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className='text-sm text-muted-foreground mb-4'>{exam.description}</p>

      {/* Requirement-based readiness: x of the configured requirement items met. */}
      <div className='mb-3'>
        <div className='flex items-center justify-between text-xs text-muted-foreground mb-1.5'>
          <span>Readiness requirements met</span>
          <span className='font-semibold text-foreground'>
            {requirement.metCount} / {requirement.totalCount}
          </span>
        </div>
        <div className='h-2 bg-muted rounded-full overflow-hidden' role='progressbar'
          aria-valuenow={metPercent} aria-valuemin={0} aria-valuemax={100}
          aria-label={'Readiness for ' + exam.name}>
          <div
            className={'h-full rounded-full transition-all ' + (requirement.ready ? 'bg-green-500' : 'bg-primary')}
            style={{ width: Math.max(metPercent, 2) + '%' }}
          />
        </div>
      </div>

      <div className='mb-5 text-xs text-muted-foreground space-y-1'>
        {status !== 'NOT_STARTED' && unmetSections.length > 0 && (
          <p>
            <span className='text-amber-700 font-medium'>{unmetSections.length} profile section{unmetSections.length > 1 ? 's' : ''}</span>
            {' incomplete — reuse your saved details: '}
            {unmetSections.map(item => item.label.replace('Profile: ', '')).join(', ')}
          </p>
        )}
        {status !== 'NOT_STARTED' && unmetDocs.length > 0 && (
          <p>
            <span className='text-amber-700 font-medium'>{unmetDocs.length} document{unmetDocs.length > 1 ? 's' : ''}</span>
            {' not uploaded yet'}
          </p>
        )}
        {status !== 'NOT_STARTED' && unmet.length === 0 && (
          <p className='text-green-700'>All readiness requirements are met.</p>
        )}
        {status === 'NOT_STARTED' && (
          <p>Tracks profile sections and documents for this exam — nothing is sent anywhere.</p>
        )}
      </div>

      <button
        type='button'
        onClick={onOpen}
        className='mt-auto w-full px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors'
      >
        {CTA_LABELS[status]}
      </button>

      <p className='mt-3 text-[11px] leading-relaxed text-muted-foreground'>{OFFICIAL_SOURCE_NOTE}</p>
    </div>
  )
}
