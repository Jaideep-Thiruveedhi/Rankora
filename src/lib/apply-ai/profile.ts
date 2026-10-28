import type { ProfileSectionDef, ProfileSectionId } from './types'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

export const STATE_OPTIONS = INDIAN_STATES.map(s => ({ value: s, label: s }))

export const MARKS_KIND_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'GRADE', label: 'Grade' },
  { value: 'CGPA', label: 'CGPA' },
]

/**
 * The reusable student profile sections, shared by every examination application.
 *
 * Field `required` flags drive readiness computation — they are preparation
 * requirements, NOT eligibility rules of any exam. Every required field is
 * something application forms in general need (identity, academics, contact).
 */
export const PROFILE_SECTIONS: ProfileSectionDef[] = [
  {
    id: 'personal',
    title: 'Personal information',
    description: 'Identity and contact details reused across all examination applications.',
    icon: '👤',
    fields: [
      { id: 'fullName', label: 'Full name', type: 'text', required: true, placeholder: 'As printed on official records' },
      { id: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
      { id: 'gender', label: 'Gender', type: 'select', required: false, help: 'Some examinations ask for it; leave empty if you are not sure yet.', options: [
        { value: 'MALE', label: 'Male' },
        { value: 'FEMALE', label: 'Female' },
        { value: 'TRANSGENDER', label: 'Transgender' },
      ] },
      { id: 'email', label: 'Email address', type: 'email', required: true, placeholder: 'you@example.com', help: 'Where examination bodies send admit cards and communications.' },
      { id: 'mobileNumber', label: 'Mobile number', type: 'tel', required: true, placeholder: 'e.g., 9876543210' },
      { id: 'addressLine', label: 'Address', type: 'address', required: true, placeholder: 'House / street / locality' },
      { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'e.g., Patna' },
      { id: 'state', label: 'State', type: 'select', required: true, options: STATE_OPTIONS },
      { id: 'pinCode', label: 'PIN code', type: 'text', required: true, placeholder: '6 digits' },
    ],
  },
  {
    id: 'class10',
    title: 'Class 10 details',
    description: 'Used to verify identity and date of birth.',
    icon: '🏛️',
    fields: [
      { id: 'class10Board', label: 'Board', type: 'text', required: true, placeholder: 'e.g., CBSE, ICSE, State Board' },
      { id: 'class10PassingYear', label: 'Passing year', type: 'number', required: true, placeholder: 'e.g., 2023' },
      { id: 'class10MarksKind', label: 'Marks format', type: 'select', required: false, options: MARKS_KIND_OPTIONS, help: 'How your Class 10 result is recorded. Leave unchecked and enter the value raw if unsure.' },
      { id: 'class10Marks', label: 'Marks / grade', type: 'text', required: true, placeholder: 'e.g., 92.4 or A1', help: 'Enter exactly as printed — never alter or estimate.' },
      { id: 'class10RollNumber', label: 'Roll number', type: 'text', required: false, placeholder: 'As printed on the certificate' },
      { id: 'class10Subjects', label: 'Class 10 subjects', type: 'subjects', required: false, subjectListKey: 'class10Subjects', subjectRequired: false, help: 'Add the subjects you studied in Class 10. Individual marks/grades optional.' },
    ],
  },
  {
    id: 'class12',
    title: 'Class 12 details',
    description: 'Used to verify qualification for admission.',
    icon: '📘',
    fields: [
      { id: 'class12Board', label: 'Board', type: 'text', required: true, placeholder: 'e.g., CBSE, ICSE, State Board' },
      { id: 'class12PassingYear', label: 'Passing year', type: 'number', required: true, placeholder: 'e.g., 2025' },
      { id: 'class12MarksKind', label: 'Marks format', type: 'select', required: false, options: MARKS_KIND_OPTIONS, help: 'How your Class 12 result is recorded. Leave unchecked and enter the value raw if unsure.' },
      { id: 'class12Marks', label: 'Marks / grade', type: 'text', required: true, placeholder: 'e.g., 91.8 or 9.2', help: 'Enter exactly as printed — never alter or estimate.' },
      { id: 'class12RollNumber', label: 'Roll number', type: 'text', required: false, placeholder: 'As printed on the certificate' },
      { id: 'class12Subjects', label: 'Class 12 subjects', type: 'subjects', required: true, subjectListKey: 'class12Subjects', subjectRequired: true, help: 'Add at least the subjects you studied, with exact marks/grades where printed.' },
    ],
  },
  {
    id: 'preferences',
    title: 'Additional information',
    description: 'Preferences that shape your document checklist. No exam rules are inferred from them.',
    icon: '🧭',
    fields: [
      { id: 'category', label: 'Category', type: 'select', required: false, help: 'Only relevant if an examination you target accepts category-based claims — pick a value only if it applies to you.', options: [
        { value: 'GENERAL', label: 'General' },
        { value: 'EWS', label: 'EWS' },
        { value: 'OBC_NCL', label: 'OBC-NCL' },
        { value: 'SC', label: 'SC' },
        { value: 'ST', label: 'ST' },
      ] },
      { id: 'pwdStatus', label: 'PwD status', type: 'boolean', required: true, help: 'Mark yes only if you intend to claim PwD provisions somewhere. Otherwise leave unchecked.' },
      { id: 'homeState', label: 'Home state', type: 'select', required: false, options: STATE_OPTIONS, help: 'Used for state-linked preferences; check what each examination asks for.' },
      { id: 'preferredExamCities', label: 'Preferred examination cities', type: 'cities', required: false, help: 'Up to 6, comma-separated (e.g., Delhi, Patna, Hyderabad). Enter only cities you would accept — Rankora will not choose for you.' },
    ],
  },
]

export const PROFILE_SECTION_BY_ID: Record<ProfileSectionId, ProfileSectionDef> = Object.fromEntries(
  PROFILE_SECTIONS.map(section => [section.id, section])
) as Record<ProfileSectionId, ProfileSectionDef>
