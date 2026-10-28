import { DOCUMENT_TYPE_BY_ID } from './documents'
import { EXAM_BY_ID } from './exams'
import { PROFILE_SECTIONS } from './profile'
import type {
  DocumentId,
  ExamId,
  ExamRequirement,
  ProfileSectionId,
  ProfileStatus,
  RequirementItem,
  SubjectEntry,
  UploadedDocumentDTO,
} from './types'

/**
 * Requirement evaluation for Apply AI.
 *
 * Readiness is computed ONLY from concrete, configured requirements — the
 * reused profile sections and the applicable document checklist. No
 * arbitrary percentage weighting: an exam is "Ready for review" exactly when
 * every one of its configured requirement items is met.
 */

/**
 * Profile-like value: the server DTO, a local form draft, a partial payload or
 * null — any object shape is accepted; helpers narrow internally.
 */
export type ProfileLike = unknown

function asRecord(payload: ProfileLike): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  return payload as Record<string, unknown>
}

export function getProfileText(payload: ProfileLike, fieldId: string): string {
  const record = asRecord(payload)
  if (!record) return ''
  const value = record[fieldId]
  if (value === null || value === undefined || value === false) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

export function getProfileBool(payload: ProfileLike, fieldId: string): boolean {
  return asRecord(payload)?.[fieldId] === true
}

export function getProfileSubjects(payload: ProfileLike, listKey: string): SubjectEntry[] | null {
  const value = asRecord(payload)?.[listKey]
  return Array.isArray(value) && value.length > 0 ? (value as SubjectEntry[]) : null
}

function isFieldFilled(payload: ProfileLike, fieldId: string): boolean {
  return getProfileText(payload, fieldId).length > 0
}

/* ---------------- Profile evaluation ---------------- */

export interface SectionStatus {
  sectionId: ProfileSectionId
  done: boolean
  /** Human labels of the missing required fields. */
  missingLabels: string[]
}

export interface ProfileEvaluation {
  sections: SectionStatus[]
  status: ProfileStatus
  missingLabels: string[]
  completedSections: number
  totalSections: number
}

export function evaluateProfile(payload: ProfileLike): ProfileEvaluation {
  const sections: SectionStatus[] = PROFILE_SECTIONS.map(section => {
    const missingLabels: string[] = []

    for (const field of section.fields) {
      if (field.type === 'subjects') {
        if (field.subjectRequired && !getProfileSubjects(payload, field.subjectListKey ?? '')) {
          missingLabels.push(field.label)
        }
        continue
      }
      if (!field.required) continue
      if (field.type === 'boolean') continue // booleans always have an implicit answer
      if (!isFieldFilled(payload, field.id)) {
        missingLabels.push(field.label)
      }
    }

    return { sectionId: section.id, done: missingLabels.length === 0, missingLabels }
  })

  const filledCount = sections.filter(s => s.done).length
  const anyValue = PROFILE_SECTIONS.flatMap(s => s.fields).some(
    field => field.type === 'subjects'
      ? getProfileSubjects(payload, field.subjectListKey ?? '')
      : field.type !== 'boolean' && getProfileText(payload, field.id).length > 0
  )

  const status: ProfileStatus =
    filledCount === sections.length ? 'COMPLETE' : anyValue ? 'IN_PROGRESS' : 'INCOMPLETE'

  return {
    sections,
    status,
    missingLabels: sections.flatMap(s => s.missingLabels),
    completedSections: filledCount,
    totalSections: sections.length,
  }
}

/* ---------------- Document applicability ---------------- */

/**
 * Whether a checklist row applies to this student right now. Conditional rows
 * appear only when the student's own answers make them potentially relevant —
 * Rankora never decides which certificates an exam requires.
 */
export function isDocumentApplicable(docId: DocumentId, payload: ProfileLike): boolean {
  if (docId === 'CATEGORY_CERTIFICATE') {
    const category = getProfileText(payload, 'category')
    return category.length > 0 && category !== 'GENERAL'
  }
  if (docId === 'PWD_CERTIFICATE') return getProfileBool(payload, 'pwdStatus')
  return true
}

export function requiredDocumentIdsForExam(examId: ExamId, payload: ProfileLike): DocumentId[] {
  const exam = EXAM_BY_ID[examId]
  return exam.requiredDocIds.filter(docId => isDocumentApplicable(docId, payload))
}

/** Active (non-deleted) documents of a given checklist type. */
export function documentsOfType(docType: DocumentId, documents: UploadedDocumentDTO[]): UploadedDocumentDTO[] {
  return documents.filter(doc => doc.documentType === docType)
}

export function isDocumentUploaded(docType: DocumentId, documents: UploadedDocumentDTO[]): boolean {
  return documentsOfType(docType, documents).length > 0
}

/* ---------------- Exam requirement evaluation ---------------- */

export function evaluateExamRequirements(
  examId: ExamId,
  payload: ProfileLike,
  documents: UploadedDocumentDTO[]
): ExamRequirement {
  const exam = EXAM_BY_ID[examId]
  const profileEvaluation = evaluateProfile(payload)

  const items: RequirementItem[] = []

  for (const sectionId of exam.requiredSections) {
    const status = profileEvaluation.sections.find(s => s.sectionId === sectionId)
    const sectionDef = PROFILE_SECTIONS.find(s => s.id === sectionId)!
    items.push({
      id: 'section-' + sectionId,
      kind: 'profile-section',
      label: 'Profile: ' + sectionDef.title,
      detail: status && !status.done
        ? 'Missing: ' + status.missingLabels.join(', ')
        : 'Complete',
      met: status?.done ?? false,
      href: '/apply/profile#profile-section-' + sectionId,
    })
  }

  for (const docId of requiredDocumentIdsForExam(examId, payload)) {
    const docDef = DOCUMENT_TYPE_BY_ID[docId]
    items.push({
      id: 'document-' + docId,
      kind: 'document',
      label: 'Document: ' + docDef.label + (docDef.conditional ? ' (if it applies to you)' : ''),
      detail: 'Upload once on the Documents page; every exam reuses it.',
      met: isDocumentUploaded(docId, documents),
      href: '/apply/documents#document-type-' + docId,
    })
  }

  return {
    examId,
    items,
    metCount: items.filter(item => item.met).length,
    totalCount: items.length,
    ready: items.length > 0 && items.every(item => item.met),
  }
}

/** Readiness state for one exam, combining server requirements + local tracker. */
export function getApplicationStatus(requirement: ExamRequirement, started: boolean): {
  status: 'NOT_STARTED' | 'PREPARING' | 'READY_FOR_REVIEW'
} {
  if (!started) return { status: 'NOT_STARTED' }
  return { status: requirement.ready ? 'READY_FOR_REVIEW' : 'PREPARING' }
}
