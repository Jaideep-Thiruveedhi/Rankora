import { MARKS_KIND_OPTIONS, STATE_OPTIONS } from '@/lib/apply-ai/profile'
import { PROFILE_FIELD_IDS } from '@/lib/apply-ai/validation'

/**
 * Apply Agent V1 — canonical field registry + deterministic alias engine.
 *
 * Canonical names come from the EXISTING profile schema (PROFILE_FIELD_IDS in
 * validation.ts); the additions here are:
 *  - derived date-of-birth parts (day/month/year) that application forms ask
 *    for as separate dropdowns — derived FROM the saved dateOfBirth, never
 *    invented values
 *  - metadata used by deterministic alias matching (tier 1 of field mapping)
 *
 * Subject mark tables (class10Subjects/class12Subjects) are deliberately
 * excluded from autofill this milestone: complex per-row tables, and filling
 * them wrongly could misrepresent student marks. When detected they are
 * reported as "manual".
 */

export const AGENT_FILLABLE_FIELDS = [
  'fullName',
  'gender',
  'dateOfBirth',
  'dateOfBirthDay',
  'dateOfBirthMonth',
  'dateOfBirthYear',
  'email',
  'mobileNumber',
  'addressLine',
  'city',
  'state',
  'pinCode',
  'class10Board',
  'class10PassingYear',
  'class10RollNumber',
  'class10MarksKind',
  'class10Marks',
  'class12Board',
  'class12PassingYear',
  'class12RollNumber',
  'class12MarksKind',
  'class12Marks',
  'category',
  'pwdStatus',
  'homeState',
  'preferredExamCities',
] as const

export type AgentFillableField = (typeof AGENT_FILLABLE_FIELDS)[number]

/** The allowlist the (optional) model must obey, and values can only come from. */
export const AGENT_FILLABLE_SET: ReadonlySet<string> = new Set(AGENT_FILLABLE_FIELDS)

/**
 * Type guard used by the AI tier: a model suggestion is only usable when it
 * names a fillable canonical field that is not manual-only.
 */
export function isFillableAgentField(field: string): field is AgentFillableField {
  return AGENT_FILLABLE_SET.has(field) && !AGENT_MANUAL_ONLY_SET.has(field)
}

/** Profile list fields the agent reports as manual-only instead of filling. */
export const AGENT_MANUAL_ONLY_SET: ReadonlySet<string> = new Set([
  'class10Subjects',
  'class12Subjects',
])

export type AgentValueKind =
  | 'text'
  | 'enum'
  | 'date-iso'
  | 'date-part'
  | 'boolean'
  | 'year'
  | 'number'
  | 'email'
  | 'tel'
  | 'city-list'

const VALUE_KINDS: Record<AgentFillableField, AgentValueKind> = {
  fullName: 'text',
  gender: 'enum',
  dateOfBirth: 'date-iso',
  dateOfBirthDay: 'date-part',
  dateOfBirthMonth: 'date-part',
  dateOfBirthYear: 'date-part',
  email: 'email',
  mobileNumber: 'tel',
  addressLine: 'text',
  city: 'text',
  state: 'enum',
  pinCode: 'text',
  class10Board: 'text',
  class10PassingYear: 'year',
  class10RollNumber: 'text',
  class10MarksKind: 'enum',
  class10Marks: 'text',
  class12Board: 'text',
  class12PassingYear: 'year',
  class12RollNumber: 'text',
  class12MarksKind: 'enum',
  class12Marks: 'text',
  category: 'enum',
  pwdStatus: 'boolean',
  homeState: 'enum',
  preferredExamCities: 'city-list',
}

export function agentValueKind(field: string): AgentValueKind {
  return VALUE_KINDS[field as AgentFillableField] ?? 'text'
}

/* ---------------------------------------------------------------------------
 * Normalization + unsafe-field guard
 * ------------------------------------------------------------------------- */

/** Lowercases, strips punctuation, collapses whitespace. */
export function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Strips parenthesized qualifiers — "Email Address (registered)" → "email address". */
export function normalizeForExactMatch(raw: string): string {
  return normalizeLabel(raw.replace(/\([^)]*\)/g, ' '))
}

/**
 * Fields that are never addressed by the agent (defense in depth: the content
 * script already skips detection of these; the server refuses them again).
 * Patterns deliberately do NOT match our canonical "pin code" (PIN ≠ OTP/payment).
 */
const UNSAFE_PATTERNS: RegExp[] = [
  /password/i,
  /\bpasswd\b/i,
  /\botp\b/i,
  /one[\s-]?time/i,
  /\bcaptcha\b/i,
  /\bcvv\b/i,
  /\bcvc\b/i,
  /card[\s-]?(no|number|num|holder)/i,
  /\bdebit\b/i,
  /credit[\s-]?card/i,
  /\bpayment\b/i,
  /security[\s-]?(code|pin)/i,
  /bank[\s-]?(account|ifsc|branch)/i,
  /\baadhaar\b/i,
  /\baadhar\b/i,
  /\bupload\b/i,
  /\battach(ment)?\b/i,
]

export function isUnsafeFieldDescriptor(input: {
  label: string
  inputName: string
  inputId: string
  inputType?: string
  autocomplete?: string
}): boolean {
  const haystack = [input.label, input.inputName, input.inputId, input.inputType ?? '', input.autocomplete ?? ''].join(' | ')
  return UNSAFE_PATTERNS.some(pattern => pattern.test(haystack))
}

/* ---------------------------------------------------------------------------
 * Option sets (canonical) + option-shape heuristics
 * ------------------------------------------------------------------------- */

export const PROFILE_OPTION_SETS = {
  state: STATE_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  gender: [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'TRANSGENDER', label: 'Transgender' },
  ],
  category: [
    { value: 'GENERAL', label: 'General' },
    { value: 'EWS', label: 'EWS' },
    { value: 'OBC_NCL', label: 'OBC-NCL' },
    { value: 'SC', label: 'SC' },
    { value: 'ST', label: 'ST' },
  ],
  marksKind: MARKS_KIND_OPTIONS.map(o => ({ value: o.value, label: o.label })),
} as const

export interface OptionPair {
  text: string
  value: string
}

const MONTH_WORDS = new Set([
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
])
/** Normalized forms of the category option set for shape detection. */
const CATEGORY_HINT_WORDS = new Set(['general', 'ews', 'obc', 'sc', 'st', 'obc ncl'])
const GENDER_OPTION_WORDS = new Set(['male', 'female', 'transgender', 'other', 'third gender', 'transgender male', 'transgender female'])
const MARKS_KIND_WORDS = new Set(['percentage', 'grade', 'cgpa', 'marks', 'sgpa'])

function isIntegerInRange(raw: string, min: number, max: number): boolean {
  const value = parseInt(raw, 10)
  return String(value) === raw && value >= min && value <= max
}

function optionsLookLikeDay(options: OptionPair[]): boolean {
  const values = options.map(o => o.value || o.text)
  return values.length >= 15 && values.every(v => isIntegerInRange(v, 1, 31))
}

function optionsLookLikeMonth(options: OptionPair[]): boolean {
  const values = options.map(o => o.text.toLowerCase())
  if (values.length < 12) return false
  return values.every(v => MONTH_WORDS.has(v) || isIntegerInRange(v, 1, 12))
}

function optionsLookLikeYear(options: OptionPair[]): boolean {
  const values = options.map(o => o.value || o.text)
  if (values.length < 8) return false
  return values.every(v => isIntegerInRange(v, 1950, 2035))
}

function optionsLookLikeStates(options: OptionPair[]): boolean {
  const stateLabels = new Set(PROFILE_OPTION_SETS.state.map(o => normalizeLabel(o.label)))
  let hits = 0
  for (const option of options) {
    if (stateLabels.has(normalizeForExactMatch(option.text))) hits += 1
  }
  return hits >= 8
}

function optionsLookLikeCategory(options: OptionPair[]): boolean {
  const labels = options.map(o => normalizeForExactMatch(o.text))
  const hits = labels.filter(l => CATEGORY_HINT_WORDS.has(l.split(' ')[0]) || CATEGORY_HINT_WORDS.has(l)).length
  return options.length >= 4 && hits >= 3
}

function optionsLookLikeGender(options: OptionPair[]): boolean {
  const labels = options.map(o => normalizeForExactMatch(o.text))
  return options.length >= 2 && options.length <= 4 && labels.every(l => GENDER_OPTION_WORDS.has(l))
}

function optionsLookLikeMarksKind(options: OptionPair[]): boolean {
  const labels = options.map(o => normalizeForExactMatch(o.text))
  return options.length === 3 && labels.every(l => MARKS_KIND_WORDS.has(l.split(' ')[0]))
}

/* ---------------------------------------------------------------------------
 * Class-scoped compound fields (boards / passing years / roll numbers / marks)
 * ------------------------------------------------------------------------- */

const CLASS_10_WORDS = /\b(10|10th|x|xth|ten|tenth|sslc|matric|matriculation)\b/
const CLASS_12_WORDS = /\b(12|12th|xii|xiith|twelve|twelfth|hsc|intermediate|inter|senior secondary|sr secondary)\b/
const BOARD_HINT = /\b(board|university of secondary|council)\b/
const PASSING_YEAR_HINT = /\b(year of passing|passing year|pass out year|passed out|year of pass|passing)\b|\byear\b.*\b(pass|passed)\b/
const ROLL_HINT = /\broll\b/
const MARKS_HINT = /\b(marks|mark obtained|marks obtained|percentage obtained|score|aggregate)\b/
const MARKS_KIND_HINT = /\b(format|kind|type|scheme)\b.*\b(marks|percentage|grade)\b|\bmarks\b.*\b(format|kind|type|scheme)\b/

function classHints(label: string): { class10: boolean; class12: boolean } {
  return { class10: CLASS_10_WORDS.test(label), class12: CLASS_12_WORDS.test(label) }
}

const CLASS_FAMILY: Record<string, [AgentFillableField, AgentFillableField]> = {
  board: ['class10Board', 'class12Board'],
  year: ['class10PassingYear', 'class12PassingYear'],
  roll: ['class10RollNumber', 'class12RollNumber'],
  marks: ['class10Marks', 'class12Marks'],
  marksKind: ['class10MarksKind', 'class12MarksKind'],
}

/* ---------------------------------------------------------------------------
 * Tier-1 alias table (labels matched after parenthetical stripping)
 * ------------------------------------------------------------------------- */

const ALIASES_SINGLE: { canonical: AgentFillableField; labels: readonly string[] }[] = [
  { canonical: 'fullName', labels: ['full name', 'name of candidate', 'name of the candidate', 'candidate name', 'candidates name', 'applicant name', 'name of applicant', 'students name', 'name'] },
  { canonical: 'gender', labels: ['gender', 'sex'] },
  { canonical: 'dateOfBirth', labels: ['date of birth', 'birth date', 'date of brith', 'dob'] },
  { canonical: 'email', labels: ['email', 'email address', 'email id', 'e mail', 'e mail address', 'mail id'] },
  { canonical: 'mobileNumber', labels: ['mobile number', 'mobile', 'mobile no', 'phone number', 'phone', 'contact number', 'contact no', 'telephone number', 'telephone'] },
  { canonical: 'addressLine', labels: ['address', 'address line 1', 'address line', 'postal address', 'residential address'] },
  { canonical: 'city', labels: ['city', 'town', 'city town', 'town city', 'current city'] },
  { canonical: 'state', labels: ['state', 'select state', 'state name', 'state of residence', 'state union territory', 'state ut'] },
  { canonical: 'homeState', labels: ['home state', 'domicile state', 'state of domicile'] },
  { canonical: 'pinCode', labels: ['pin code', 'pincode', 'pin', 'postal code', 'zip code', 'zip'] },
  { canonical: 'category', labels: ['category', 'reservation category', 'community', 'social category', 'caste category', 'category community'] },
  { canonical: 'pwdStatus', labels: ['pwd', 'pwd status', 'person with disability', 'persons with disability', 'disability status', 'are you pwd'] },
  { canonical: 'preferredExamCities', labels: ['preferred exam cities', 'preferred examination cities', 'preferred cities', 'exam cities', 'preferred exam centres', 'preferred examination centres'] },
  { canonical: 'dateOfBirthDay', labels: ['day', 'dob day', 'birth day', 'day of birth', 'date of birth day'] },
  { canonical: 'dateOfBirthMonth', labels: ['month', 'dob month', 'birth month', 'month of birth', 'date of birth month'] },
  { canonical: 'dateOfBirthYear', labels: ['year', 'dob year', 'birth year', 'year of birth', 'date of birth year'] },
]

/** Address variants that are semantically one of several possible addresses —
 * mapped to our single addressLine but always surfaced for review. */
const ADDRESS_REVIEW_LABELS = new Set([
  'correspondence address',
  'permanent address',
  'communication address',
  'address line 2',
  'present address',
  'local address',
])

/* ---------------------------------------------------------------------------
 * Deterministic match result
 * ------------------------------------------------------------------------- */

export type AgentTargetStatus =
  | 'mapped'
  | 'ambiguous'
  | 'manual'
  | 'unsafe'
  | 'unmapped'

export interface AgentMappingCandidate {
  status: AgentTargetStatus
  canonical: AgentFillableField | null
  /** Candidate canonical names that need a student decision. */
  ambiguous: string[]
  needsReview: boolean
  reason: string
}

function mapped(canonical: AgentFillableField, reason: string, needsReview = false): AgentMappingCandidate {
  return { status: 'mapped', canonical, ambiguous: [], needsReview, reason }
}

function ambiguous(candidates: string[], reason: string): AgentMappingCandidate {
  return { status: 'ambiguous', canonical: null, ambiguous: candidates, needsReview: false, reason }
}

function unmapped(reason: string): AgentMappingCandidate {
  return { status: 'unmapped', canonical: null, ambiguous: [], needsReview: false, reason }
}

function manual(reason: string): AgentMappingCandidate {
  return { status: 'manual', canonical: null, ambiguous: [], needsReview: false, reason }
}

export interface AgentFieldDescriptorInput {
  kind: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email' | 'tel' | 'file'
  label: string
  inputName: string
  inputId: string
  required: boolean
  options: OptionPair[]
  inputType?: string
  autocomplete?: string
}

/**
 * Tier-1 deterministic mapping. Pure function: labels/options in, mapping
 * decision out — no profile values, no network, no model involved.
 */
export function matchFieldDeterministically(input: AgentFieldDescriptorInput): AgentMappingCandidate {
  const rawLabel = input.label.trim()
  const exact = normalizeForExactMatch(rawLabel)
  const loose = normalizeLabel(rawLabel)

  if (isUnsafeFieldDescriptor({ label: rawLabel, inputName: input.inputName, inputId: input.inputId, inputType: input.inputType, autocomplete: input.autocomplete })) {
    return { status: 'unsafe', canonical: null, ambiguous: [], needsReview: false, reason: 'Skipped for safety (password, OTP, payment or identity-document related)' }
  }

  // Subject mark tables are never autofilled this milestone.
  const hints = classHints(loose)
  if (
    AGENT_MANUAL_ONLY_SET.has(exact) ||
    (/subjects?\b/.test(loose) && (hints.class10 || hints.class12 || /\b(mark|marks|grade|score)\b/.test(loose)))
  ) {
    return manual('Subject mark tables are filled by hand; the agent never touches them (V1)')
  }

  const checkbox = input.kind === 'checkbox'
  const isSelectLike = input.kind === 'select' || input.kind === 'radio'

  if (checkbox) {
    // Only PwD status maps to checkboxes deterministically; other checkboxes
    // ("I agree", terms etc.) are consent actions the student must do themself.
    for (const { canonical, labels } of ALIASES_SINGLE) {
      if (canonical !== 'pwdStatus') continue
      if (labels.includes(exact) || labels.includes(loose)) return mapped(canonical, 'Checkbox label matched PwD status')
    }
    if (/\b(disabled|disability|pwd)\b/.test(loose)) return mapped('pwdStatus', 'Checkbox matched PwD wording')
    return unmapped('Consent/action checkboxes are left to the student')
  }

  // ----- tier 1a: exact alias match (order matters, specific before generic)
  for (const { canonical, labels } of ALIASES_SINGLE) {
    if (labels.includes(exact) || (labels.length > 1 && labels.includes(loose))) {
      if (canonical === 'dateOfBirthDay' || canonical === 'dateOfBirthMonth' || canonical === 'dateOfBirthYear') {
        const birthHint = /\b(birth|dob|born)\b/.test(loose)
        return mapped(canonical, birthHint ? 'Matched date-of-birth part' : 'Matched day/month/year wording (review suggested)', !birthHint)
      }
      if (ADDRESS_REVIEW_LABELS.has(exact)) continue
      return mapped(canonical, 'Label matched a known alias')
    }
  }
  if (ADDRESS_REVIEW_LABELS.has(exact)) {
    return mapped('addressLine', 'Address variant matched — confirm it is the address you want applied (single saved address)', true)
  }

  // A plain date input labelled with birth wording is unambiguous — ISO value
  // comes straight from the saved profile.
  if (input.kind === 'date' && /^(date of birth|birth date|date of brith|dob)/.test(exact)) {
    return mapped('dateOfBirth', 'Date input matched a birth-date label')
  }

  // ----- tier 1b: class-scoped compound fields
  const hasBoard = BOARD_HINT.test(loose)
  const hasYear = PASSING_YEAR_HINT.test(loose)
  const hasRoll = ROLL_HINT.test(loose)
  const hasMarks = MARKS_HINT.test(loose)
  const hasMarksKind = MARKS_KIND_HINT.test(loose)

  const familyHits: string[] = []
  if (hasBoard) familyHits.push('board')
  if (hasYear) familyHits.push('year')
  if (hasRoll) familyHits.push('roll')
  if (hasMarks && hasMarksKind) familyHits.push('marksKind')
  else if (hasMarks) familyHits.push('marks')

  if (familyHits.length > 0) {
    const family = familyHits[0]
    const [f10, f12] = CLASS_FAMILY[family]
    if (hints.class10 && hints.class12) return ambiguous([f10, f12], 'Label mentions both Class 10 and Class 12 — needs your choice')
    if (hints.class10) return mapped(f10, 'Label matched ' + family + ' with a Class 10 reference')
    if (hints.class12) return mapped(f12, 'Label matched ' + family + ' with a Class 12 reference')
    if (familyHits.length === 1) {
      return ambiguous([f10, f12], 'Label asks for a ' + family + ' value but does not say which class — needs your choice')
    }
  }

  // ----- tier 1c: option-shape heuristics (select/radio only)
  if (isSelectLike && input.options.length > 0) {
    if (optionsLookLikeCategory(input.options)) {
      const statesInOptions = optionsLookLikeStates(input.options)
      if (!statesInOptions) return mapped('category', 'Options matched the category list (General/EWS/OBC/SC/ST)')
    }
    if (optionsLookLikeGender(input.options)) return mapped('gender', 'Options matched gender wording')
    if (optionsLookLikeMarksKind(input.options)) {
      if (hints.class10) return mapped('class10MarksKind', 'Marks-format options with a Class 10 reference')
      if (hints.class12) return mapped('class12MarksKind', 'Marks-format options with a Class 12 reference')
      return ambiguous(['class10MarksKind', 'class12MarksKind'], 'Marks-format options without a class reference — needs your choice')
    }
    if (optionsLookLikeDay(input.options)) {
      const birthHint = /\b(birth|dob|born)\b/.test(loose)
      return mapped('dateOfBirthDay', birthHint ? 'Day options with a birth-date label' : 'Numeric day options (review suggested)', true)
    }
    if (optionsLookLikeMonth(input.options)) {
      const birthHint = /\b(birth|dob|born)\b/.test(loose)
      return mapped('dateOfBirthMonth', birthHint ? 'Month options with a birth-date label' : 'Month options (review suggested)', true)
    }
    if (optionsLookLikeStates(input.options)) {
      if (/\b(domicile|home state)\b/.test(loose)) return mapped('homeState', 'State options matched a domicile/home-state label')
      if (/\bstate\b/.test(loose)) return mapped('state', 'State options matched a state label')
      return ambiguous(['state', 'homeState'], 'State options but the form does not say residence vs home state — needs your choice')
    }
    if (optionsLookLikeYear(input.options)) {
      const birthHint = /\b(birth|dob|born)\b/.test(loose)
      if (birthHint) return mapped('dateOfBirthYear', 'Year options with a birth-date label')
      if (hints.class10) return mapped('class10PassingYear', 'Year options with a Class 10 reference')
      if (hints.class12) return mapped('class12PassingYear', 'Year options with a Class 12 reference')
      if (hasYear) return ambiguous(['class10PassingYear', 'class12PassingYear'], 'Year options without a class reference — needs your choice')
      return unmapped('Year options present but the purpose is unclear to the deterministic matcher')
    }
  }

  return unmapped('No deterministic alias matched' )
}
