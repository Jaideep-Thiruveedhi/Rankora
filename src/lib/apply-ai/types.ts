export type ExamId = 'JEE_MAIN' | 'BITSAT' | 'VITEEE' | 'MET' | 'CUET_UG'

export type ApplicationStatus = 'NOT_STARTED' | 'PREPARING' | 'READY_FOR_REVIEW'

export type ProfileStatus = 'INCOMPLETE' | 'IN_PROGRESS' | 'COMPLETE'

export type ProfileSectionId = 'personal' | 'class10' | 'class12' | 'preferences'

export type MarksKind = 'PERCENTAGE' | 'GRADE' | 'CGPA'

export interface SubjectEntry {
  name: string
  kind: MarksKind
  value: string
}

export interface StudentProfileData {
  id: string
  fullName: string | null
  gender: string | null
  dateOfBirth: string | null
  email: string | null
  mobileNumber: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  pinCode: string | null
  class10Board: string | null
  class10PassingYear: number | null
  class10RollNumber: string | null
  class10MarksKind: string | null
  class10Marks: string | null
  class10Subjects: SubjectEntry[] | null
  class12Board: string | null
  class12PassingYear: number | null
  class12RollNumber: string | null
  class12MarksKind: string | null
  class12Marks: string | null
  class12Subjects: SubjectEntry[] | null
  category: string | null
  pwdStatus: boolean
  homeState: string | null
  preferredExamCities: string[] | null
  createdAt: string
  updatedAt: string
}

export type DocumentId =
  | 'PHOTO'
  | 'SIGNATURE'
  | 'CLASS10_MARKSHEET'
  | 'CLASS12_MARKSHEET'
  | 'CATEGORY_CERTIFICATE'
  | 'PWD_CERTIFICATE'
  | 'OTHER'

export interface UploadedDocumentDTO {
  id: string
  documentType: DocumentId
  displayLabel: string | null
  originalName: string
  mimeType: string
  sizeBytes: number
  versions: number
  createdAt: string
  replacedAt: string | null
  /** The random on-disk filename is intentionally never exposed to clients. */
}

/** Form rendering definition for one profile field. */
export interface ProfileFieldDef {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'boolean' | 'address' | 'subjects' | 'cities'
  required: boolean
  placeholder?: string
  help?: string
  options?: { value: string; label: string }[]
  subjectListKey?: 'class10Subjects' | 'class12Subjects'
  subjectRequired?: boolean
}

export interface ProfileSectionDef {
  id: ProfileSectionId
  title: string
  description: string
  icon: string
  fields: ProfileFieldDef[]
}

export interface DocumentTypeDef {
  id: DocumentId
  label: string
  description: string
  icon: string
  /** true when the document only applies for certain profile answers (certificates). */
  conditional: boolean
  /** Guidance text — always points students to the official notification. */
  guidance: string
}

export interface ExamDefinition {
  id: ExamId
  name: string
  fullName: string
  organizer: string
  description: string
  icon: string
  /** Profile sections this exam's preparation reuses. */
  requiredSections: ProfileSectionId[]
  /** Base documents every applicant must keep ready (general aid, verify officially). */
  requiredDocIds: DocumentId[]
}

export interface ApplicationRecord {
  startedAt: string | null
  updatedAt: string | null
}

/** One configured requirement item for an exam's readiness computation. */
export interface RequirementItem {
  id: string
  kind: 'profile-section' | 'document'
  label: string
  detail: string
  met: boolean
  /** Where the student goes to complete this requirement. */
  href: string
}

export interface ExamRequirement {
  examId: ExamId
  items: RequirementItem[]
  metCount: number
  totalCount: number
  /** True only when every configured requirement item is met. */
  ready: boolean
}
