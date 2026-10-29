'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { EXAMS, OFFICIAL_SOURCE_NOTE } from '@/lib/apply-ai/exams'
import { useApplyStore } from '@/lib/apply-ai/store'
import {
  evaluateExamRequirements,
  getApplicationStatus,
  isDocumentApplicable,
  isDocumentUploaded,
} from '@/lib/apply-ai/requirements'
import { DOCUMENT_TYPES } from '@/lib/apply-ai/documents'
import {
  useAgentState,
  useDocuments,
  useEnsureWorkspace,
  useProfile,
} from '@/lib/apply-ai/api-client'
import type { ApplicationStatus, ExamId } from '@/lib/apply-ai/types'
import { ApplyHeader } from '@/components/apply/apply-header'
import { SaveWorkBanner } from '@/components/apply/save-work-banner'
import { PreparationWorkflow } from '@/components/apply/preparation-workflow'
import { AgentConnectionCard } from '@/components/apply/agent/agent-connection-card'
import { AgentPlanPreviewCard } from '@/components/apply/agent/agent-plan-preview'
import { AgentReadinessCard } from '@/components/apply/agent/agent-readiness-card'

const emptySubscribe = () => () => {}

function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

const AGENT_CAPABILITIES = [
  'Reads the labels of visible form fields on the page you are working on — never the page content around them.',
  'Proposes which saved profile field matches each form field, and shows the plan before anything happens.',
  'Fills supported inputs, selects, radios and checkboxes only after you approve the plan inside the extension.',
  'Never touches passwords, OTPs, CAPTCHAs, payments, file uploads or consent checkboxes.',
  'Stops before submission — you always press Submit on the official portal yourself.',
]

/**
 * Rankora Apply Agent (V1) — control center.
 *
 * Readiness/preparation reuse the existing profile, document and
 * examination-requirements logic; the page adds pairing, connection state and
 * the detection-plan preview. The extension popup remains the single place
 * where a fill is reviewed and approved.
 */
export default function ApplyAgentPage() {
  const hydrated = useHydrated()
  const { ready: workspaceReady, status: workspaceStatus, rerun: rerunWorkspace } = useEnsureWorkspace()

  const dataBlocked = workspaceStatus === 'claimable' || workspaceStatus === 'unavailable'
  const agentEnabled = workspaceReady && !dataBlocked
  const profileQuery = useProfile(agentEnabled)
  const documentsQuery = useDocuments(agentEnabled)
  const agentStateQuery = useAgentState(agentEnabled)

  const applications = useApplyStore(state => state.applications)
  const [selectedExamId, setSelectedExamId] = useState<ExamId>('JEE_MAIN')

  const profile = profileQuery.data?.profile ?? null
  const documents = useMemo(() => documentsQuery.data?.documents ?? [], [documentsQuery.data])
  const evaluation = profileQuery.data?.evaluation ?? null

  const requirementsByExam = useMemo(() => {
    const map = {} as Record<string, { requirement: ReturnType<typeof evaluateExamRequirements>; status: ApplicationStatus }>
    for (const exam of EXAMS) {
      const requirement = evaluateExamRequirements(exam.id, profile, documents)
      map[exam.id] = {
        requirement,
        status: getApplicationStatus(requirement, !!applications[exam.id]).status,
      }
    }
    return map
  }, [profile, documents, applications])

  const loading =
    !hydrated ||
    !workspaceReady ||
    (!dataBlocked && (profileQuery.isLoading || documentsQuery.isLoading || agentStateQuery.isLoading))
  const errored = !dataBlocked && (profileQuery.isError || documentsQuery.isError)

  const selectedExam = EXAMS.find(exam => exam.id === selectedExamId) ?? EXAMS[0]
  const selectedRequirement = requirementsByExam[selectedExamId]

  const applicableDocs = useMemo(() => DOCUMENT_TYPES.filter(doc => doc.id !== 'OTHER' && isDocumentApplicable(doc.id, profile)), [profile])
  const uploadedDocs = applicableDocs.filter(doc => isDocumentUploaded(doc.id, documents)).length

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <ApplyHeader active='agent' />

      <main className='flex-1'>
        <section className='relative py-10 sm:py-14 overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10' />
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative'>
            <div className='max-w-3xl'>
              <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4'>
                Apply Agent V1
              </span>
              <h1 className='text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3'>
                Fill application forms <span className='text-primary'>with your review in the loop</span>
              </h1>
              <p className='text-sm text-muted-foreground max-w-2xl'>
                The browser agent proposes how the form fields in front of you map to your saved profile. You check
                the plan, approve it inside the extension, and it types the answers in — skipping everything that
                must stay human: submissions, payments, CAPTCHAs and OTPs.
              </p>
              <p className='mt-2 text-xs text-muted-foreground max-w-2xl'>{OFFICIAL_SOURCE_NOTE}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16'>
            <div className='grid gap-4 lg:grid-cols-3'>
              <div className='h-40 rounded-xl bg-muted/40 animate-pulse' />
              <div className='h-40 rounded-xl bg-muted/40 animate-pulse' />
              <div className='h-40 rounded-xl bg-muted/40 animate-pulse' />
            </div>
          </section>
        ) : dataBlocked ? (
          <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4'>
          <SaveWorkBanner status={workspaceStatus} onSaved={rerunWorkspace} />
          </section>
        ) : errored ? (
          <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16'>
            <div className='bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg mx-auto text-center'>
              <p className='text-sm font-semibold text-red-700 mb-2'>Could not load your data</p>
              <p className='text-xs text-red-600'>
                {(profileQuery.error as Error | null)?.message ?? (documentsQuery.error as Error | null)?.message ?? 'An unexpected error occurred.'}
              </p>
            </div>
          </section>
        ) : (
          <>
            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4'>
              <SaveWorkBanner status={workspaceStatus} onSaved={rerunWorkspace} />
            </section>

            {/* Capabilities */}
            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4'>
              <div className='bg-background border border-border rounded-2xl p-5'>
                <h2 className='text-base font-semibold text-foreground mb-2'>What the agent does — and never does</h2>
                <ul className='grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground'>
                  {AGENT_CAPABILITIES.map(item => (
                    <li key={item} className='flex gap-2'>
                      <span aria-hidden className='text-primary'>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className='text-[11px] text-muted-foreground mt-3 border-t border-border pt-3'>
                  Field matching runs on your machine with deterministic rules; a local model is consulted only for
                  labels that rules cannot classify, and only labels/option texts are ever sent to it — never your
                  actual answers. Cloud AI is not used in this milestone.
                </p>
              </div>
            </section>

            {/* Readiness + connection side by side */}
            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 grid gap-4 lg:grid-cols-2'>
              <AgentReadinessCard evaluation={evaluation} loading={profileQuery.isLoading} />
              <AgentConnectionCard state={agentStateQuery.data} loading={agentStateQuery.isLoading} />
            </section>

            {/* Demo entry */}
            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4'>
              <div className='bg-background border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3'>
                <span aria-hidden className='text-lg'>🧪</span>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-foreground'>Demonstration form</p>
                  <p className='text-xs text-muted-foreground'>
                    A clearly-labeled local page with synthetic fields to try the whole flow safely: detection,
                    mapping, preview, approval, dropdown/radio handling, missing &amp; unsafe field behaviour.
                    It is not an official portal and it never submits anywhere.
                  </p>
                </div>
                <Link
                  href='/apply/agent/demo-form'
                  className='self-start sm:self-auto px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors'
                >
                  Open demo form
                </Link>
              </div>
            </section>

            {/* Fill plan preview */}
            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4'>
              <AgentPlanPreviewCard plan={agentStateQuery.data?.plan ?? null} planAt={agentStateQuery.data?.planAt ?? null} />
            </section>

            {/* Preparation workflow (reuses the dashboard component + requirement engine) */}
            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4'>
              <div className='bg-background border border-border rounded-2xl p-5'>
                <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
                  <div>
                    <h2 className='text-base font-semibold text-foreground'>Application preparation workflow</h2>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      The same readiness engine as the dashboard: make each exam&apos;s requirements green, and the
                      agent simply speeds up the final form-filling step.
                    </p>
                  </div>
                  <label className='flex items-center gap-2 text-xs font-medium text-foreground'>
                    <span className='text-muted-foreground'>Exam</span>
                    <select
                      value={selectedExamId}
                      onChange={e => setSelectedExamId(e.target.value as ExamId)}
                      className='px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40'
                      aria-label='Choose an examination for the preparation workflow'
                    >
                      {EXAMS.map(exam => (
                        <option key={exam.id} value={exam.id}>{exam.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <PreparationWorkflow
                  examId={selectedExam.id}
                  examName={selectedExam.name}
                  requirement={selectedRequirement.requirement}
                  started={!!applications[selectedExam.id]}
                  startedAt={applications[selectedExam.id]?.startedAt ?? null}
                  status={selectedRequirement.status}
                />
                <p className='text-[11px] text-muted-foreground mt-4'>
                  {uploadedDocs} of {applicableDocs.length} applicable core documents uploaded on the
                  {' '}
                  <Link href='/apply/documents' className='text-primary hover:underline font-medium'>Documents page</Link>.
                </p>
              </div>
            </section>

            {/* Safety notice */}
            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16'>
              <div className='bg-secondary border border-border rounded-2xl p-5 text-xs text-secondary-foreground leading-relaxed'>
                <strong className='font-semibold'>Safety boundaries (V1):</strong> the agent never bypasses CAPTCHAs or
                OTP verification, never automates payment, never submits an application, never uploads your documents
                to any site, and never selects an ambiguous category or eligibility option without asking you.
                Connections are short-lived and revocable. Nothing was validated against an official examination
                portal yet — treat every fill as a demonstration until an official integration is announced.
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
