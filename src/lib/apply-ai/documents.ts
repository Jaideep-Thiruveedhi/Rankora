import type { DocumentId, DocumentTypeDef } from './types'

/**
 * Document checklist definitions for the Apply AI dashboard.
 *
 * The core rows are a GENERAL preparation aid and are identical for every
 * examination. CATEGORY/PWD certificates appear only when the student's own
 * profile answers make them potentially relevant. `OTHER` lets students keep
 * exam-specific documents they discover in official notifications — Rankora
 * never names those documents itself.
 *
 * Nothing here claims to be an official per-exam specification; every row
 * carries guidance to verify exact requirements in the official notification.
 */
export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  {
    id: 'PHOTO',
    label: 'Passport-size photograph',
    description: 'A recent, clear photograph of your face against a plain background.',
    icon: '🖼️',
    conditional: false,
    guidance: 'Portals specify size, dimensions and background — scan the notification before finalising.',
  },
  {
    id: 'SIGNATURE',
    label: 'Scanned signature',
    description: 'Your signature on white paper, scanned as a clean image.',
    icon: '✍️',
    conditional: false,
    guidance: 'Dimension and file-size rules differ per portal — verify in the notification.',
  },
  {
    id: 'CLASS10_MARKSHEET',
    label: 'Class 10 marksheet / certificate',
    description: 'Proof of identity and date of birth for most examinations.',
    icon: '📄',
    conditional: false,
    guidance: 'Keep a clear scanned copy ready; formats are specified per portal.',
  },
  {
    id: 'CLASS12_MARKSHEET',
    label: 'Class 12 marksheet / certificate',
    description: 'Academic qualification proof used at counselling and admission stages.',
    icon: '📜',
    conditional: false,
    guidance: 'If results are awaited, keep available marks / provisional documents handy instead.',
  },
  {
    id: 'CATEGORY_CERTIFICATE',
    label: 'Category certificate',
    description: 'Relevant when you intend to claim a reserved-category provision.',
    icon: '📋',
    conditional: true,
    guidance: 'Only some examinations accept category claims. Check whether, and in which format, the exams you target accept it.',
  },
  {
    id: 'PWD_CERTIFICATE',
    label: 'PwD certificate',
    description: 'Relevant when you intend to claim PwD provisions.',
    icon: '♿',
    conditional: true,
    guidance: 'PwD provisions and required formats vary by examination — always confirm in the notification.',
  },
  {
    id: 'OTHER',
    label: 'Other document',
    description: 'Any extra document an examination asks for that is not listed above.',
    icon: '🗂️',
    conditional: false,
    guidance: 'Upload only what an official notification asks for. Name it so you remember which exam needs it.',
  },
]

export const DOCUMENT_TYPE_BY_ID: Record<DocumentId, DocumentTypeDef> = Object.fromEntries(
  DOCUMENT_TYPES.map(doc => [doc.id, doc])
) as Record<DocumentId, DocumentTypeDef>

export const DOCUMENT_CHECKLIST_NOTE =
  'This checklist is a general preparation aid maintained by Rankora — it is not an official requirement list of any examination. Verify each document, specification and format on the official portal.'

export const DOCUMENT_VERIFICATION_NOTE =
  'Uploaded ≠ verified. Rankora never verifies documents and never claims a document is officially verified. Only the examination body can verify anything, on its own portal.'
