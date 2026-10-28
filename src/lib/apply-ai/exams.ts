import type { ExamDefinition, ExamId, ProfileSectionId } from './types'

/**
 * Examination catalog for the Apply AI dashboard.
 *
 * These entries intentionally contain ONLY high-level, widely-published identity
 * information (exam name, organizing body, purpose). Deadlines, fees, eligibility
 * rules and "live" application statuses are deliberately NOT stored anywhere in
 * this feature — students must verify all such details on the official portal.
 *
 * requiredSections / requiredDocIds are Rankora's own generic preparation
 * requirements (the same for every exam), not per-exam official rules.
 */
const ALL_SECTIONS: ProfileSectionId[] = ['personal', 'class10', 'class12', 'preferences']
const BASE_DOCS: ExamDefinition['requiredDocIds'] = ['PHOTO', 'SIGNATURE', 'CLASS10_MARKSHEET', 'CLASS12_MARKSHEET']

export const EXAMS: ExamDefinition[] = [
  {
    id: 'JEE_MAIN',
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination — Main',
    organizer: 'National Testing Agency (NTA)',
    description:
      'Accepted by NITs, IIITs, GFTIs and other participating institutions for undergraduate engineering admissions.',
    icon: '🎯',
    requiredSections: ALL_SECTIONS,
    requiredDocIds: BASE_DOCS,
  },
  {
    id: 'BITSAT',
    name: 'BITSAT',
    fullName: 'Birla Institute of Technology and Science Admission Test',
    organizer: 'BITS Pilani',
    description: 'Admission test for first-year undergraduate programmes across BITS campuses.',
    icon: '🧪',
    requiredSections: ALL_SECTIONS,
    requiredDocIds: BASE_DOCS,
  },
  {
    id: 'VITEEE',
    name: 'VITEEE',
    fullName: 'VIT Engineering Entrance Examination',
    organizer: 'VIT',
    description: 'Admission test for undergraduate engineering programmes across VIT campuses.',
    icon: '⚙️',
    requiredSections: ALL_SECTIONS,
    requiredDocIds: BASE_DOCS,
  },
  {
    id: 'MET',
    name: 'MET',
    fullName: 'Manipal Entrance Test',
    organizer: 'Manipal Academy of Higher Education (MAHE)',
    description: 'Admission test for undergraduate programmes across MAHE institutions.',
    icon: '🏛️',
    requiredSections: ALL_SECTIONS,
    requiredDocIds: BASE_DOCS,
  },
  {
    id: 'CUET_UG',
    name: 'CUET-UG',
    fullName: 'Common University Entrance Test — Undergraduate',
    organizer: 'National Testing Agency (NTA)',
    description: 'Entrance test used by participating universities for undergraduate admissions.',
    icon: '📚',
    requiredSections: ALL_SECTIONS,
    requiredDocIds: BASE_DOCS,
  },
]

export const EXAM_BY_ID: Record<ExamId, ExamDefinition> = Object.fromEntries(
  EXAMS.map(exam => [exam.id, exam])
) as Record<ExamId, ExamDefinition>

/** Shown on every exam surface — the dashboard never invents dates, fees or rules. */
export const OFFICIAL_SOURCE_NOTE =
  'Application dates, fees, eligibility rules and document specifications are NOT sourced by Rankora. Always confirm every requirement on the official portal of the examination body before acting on it.'
