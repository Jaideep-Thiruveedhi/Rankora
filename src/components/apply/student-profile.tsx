'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PROFILE_SECTIONS } from '@/lib/apply-ai/profile'
import { evaluateProfile, type ProfileLike } from '@/lib/apply-ai/requirements'
import { useProfile, useSaveProfile } from '@/lib/apply-ai/api-client'
import { useApplyStore } from '@/lib/apply-ai/store'
import { splitCityInput, type InvalidField } from '@/lib/apply-ai/validation'
import type { ProfileSectionDef, StudentProfileData, SubjectEntry } from '@/lib/apply-ai/types'
import { DemoDataBadge, ProfileStatusBadge } from './status-badge'

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-60'

/**
 * Full student profile editor, backed by the server. Drafts save at any time:
 * the server validates each field independently (draft mode), keeps the valid
 * ones and reports the invalid ones — nothing is auto-filled or invented, and
 * "saved" never means "verified".
 */
export function ProfileEditor({ profileReady }: { profileReady: boolean }) {
  const query = useProfile(profileReady)
  const saveProfile = useSaveProfile()
  const legacyProfileDraft = useApplyStore(state => state.legacyProfileDraft)
  const consumeLegacyDraft = useApplyStore(state => state.consumeLegacyDraft)
  const importMutation = useSaveProfile()

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [invalidFields, setInvalidFields] = useState<InvalidField[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const hydratedIdRef = useRef<string | null>(null)

  // Seed the editor once per loaded server draft (not on every keystroke).
  useEffect(() => {
    const profile = query.data?.profile
    if (!profile || hydratedIdRef.current === profile.id) return
    hydratedIdRef.current = profile.id
    setForm(draftToForm(profile))
    setInvalidFields([])
    setIsDirty(false)
  }, [query.data])

  const evaluation = useMemo(() => evaluateProfile(form as ProfileLike), [form])
  const showLegacyBanner = profileReady && !!legacyProfileDraft && !query.data?.profile

  const setField = (fieldId: string, value: unknown) => {
    setForm(prev => ({ ...prev, [fieldId]: value }))
    setIsDirty(true)
    setInvalidFields(prev => prev.filter(issue => issue.field !== fieldId))
  }

  const handleSave = () => {
    setInvalidFields([])
    saveProfile.mutate(form, {
      onSuccess: data => {
        setInvalidFields(data.invalidFields ?? [])
        setSavedAt(data.savedAt)
        setIsDirty(false)
      },
    })
  }

  if (!profileReady || query.isLoading) {
    return (
      <div className='grid md:grid-cols-2 gap-4 sm:gap-5'>
        {PROFILE_SECTIONS.map(section => (
          <div key={section.id} className='h-64 rounded-xl bg-muted/40 animate-pulse' />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className='bg-red-50 border border-red-200 rounded-xl p-6 text-center'>
        <p className='text-sm font-semibold text-red-700 mb-1'>Could not load your profile</p>
        <p className='text-xs text-red-600 mb-4'>{(query.error as Error).message}</p>
        <button
          type='button'
          onClick={() => void query.refetch()}
          className='px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors'
        >
          Try again
        </button>
      </div>
    )
  }

  const profile = query.data?.profile ?? null

  return (
    <div>
      {/* Status + save bar */}
      <div className='bg-background border border-border rounded-xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3'>
        <div className='flex flex-wrap items-center gap-3 flex-1'>
          <ProfileStatusBadge status={evaluation.status} />
          <span className='text-xs text-muted-foreground'>
            {evaluation.completedSections} of {evaluation.totalSections} sections complete
          </span>
          <DemoDataBadge />
          {savedAt && (
            <span className='text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5'>
              Draft saved {savedAt}
            </span>
          )}
        </div>
        <button
          type='button'
          onClick={handleSave}
          disabled={saveProfile.isPending}
          className='self-start sm:self-auto px-5 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50'
        >
          {saveProfile.isPending ? 'Saving…' : 'Save draft'}
        </button>
      </div>

      {saveProfile.isError && (
        <div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-xs text-red-700'>
          {saveProfile.error instanceof Error ? saveProfile.error.message : 'Could not save your draft'}
        </div>
      )}

      {importMutation.isError && (
        <div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-xs text-red-700'>
          Import failed: {importMutation.error instanceof Error ? importMutation.error.message : 'error'}
        </div>
      )}

      {invalidFields.length > 0 && (
        <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-xs text-amber-800'>
          <strong className='font-semibold'>
            Valid fields were saved, but {invalidFields.length} field{invalidFields.length === 1 ? '' : 's'} need
            attention:
          </strong>{' '}
          {invalidFields.map(issue => issue.message).join(' · ')}
        </div>
      )}

      {showLegacyBanner && (
        <div className='bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3'>
          <p className='text-xs text-foreground flex-1'>
            <strong className='font-semibold'>Local draft found.</strong> A profile draft from the earlier
            (browser-only) version of this dashboard exists on this device. Import it into your server profile? It
            is self-entered and unverified, like everything else here.
          </p>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => importMutation.mutate(legacyProfileDraft as Record<string, unknown>, {
                onSuccess: () => {
                  consumeLegacyDraft()
                  setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
                  void query.refetch()
                },
              })}
              disabled={importMutation.isPending}
              className='px-3 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50'
            >
              {importMutation.isPending ? 'Importing…' : 'Import draft'}
            </button>
            <button
              type='button'
              onClick={() => consumeLegacyDraft()}
              className='px-3 py-2 text-xs text-muted-foreground border border-border rounded-lg hover:bg-muted'
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {profile && (
        <p className='text-[11px] text-muted-foreground mb-4'>
          Last server save: {new Date(profile.updatedAt).toLocaleString('en-IN')}. All entries are{' '}
          <strong>unverified</strong> — only examination bodies verify anything, on their own portals.
        </p>
      )}

      <div className='grid md:grid-cols-2 gap-4 sm:gap-5 items-start'>
        {PROFILE_SECTIONS.map(section => (
          <ProfileSectionEditor
            key={section.id}
            section={section}
            form={form}
            evaluation={evaluation}
            invalidFields={invalidFields}
            onSetField={setField}
          />
        ))}
      </div>
    </div>
  )
}

function ProfileSectionEditor({
  section,
  form,
  evaluation,
  invalidFields,
  onSetField,
}: {
  section: ProfileSectionDef
  form: Record<string, unknown>
  evaluation: ReturnType<typeof evaluateProfile>
  invalidFields: InvalidField[]
  onSetField: (fieldId: string, value: unknown) => void
}) {
  const sectionStatus = evaluation.sections.find(s => s.sectionId === section.id)
  const errorFor = (fieldId: string): string | null =>
    invalidFields.find(issue => issue.field === fieldId)?.message ?? null

  return (
    <section
      id={'profile-section-' + section.id}
      className={'bg-background border rounded-xl p-5 scroll-mt-24 ' + (sectionStatus?.done ? 'border-green-200' : 'border-border')}
    >
      <div className='flex items-center justify-between gap-3 mb-4'>
        <div className='flex items-center gap-2.5'>
          <span aria-hidden className='text-lg'>{section.icon}</span>
          <div>
            <h3 className='font-semibold text-foreground text-sm'>{section.title}</h3>
            <p className='text-[11px] text-muted-foreground mt-0.5 max-w-[40ch]'>{section.description}</p>
          </div>
        </div>
        <span
          className={'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ' +
            (sectionStatus?.done ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200')}
        >
          {sectionStatus?.done ? 'Complete' : 'Needs attention'}
        </span>
      </div>

      <div className='grid sm:grid-cols-2 gap-3'>
        {section.fields.map(field => {
          if (field.type === 'boolean') {
            return <BooleanField key={field.id} field={field} form={form} onSetField={onSetField} />
          }
          return (
            <div
              key={field.id}
              className={field.type === 'subjects' || field.type === 'address' || field.type === 'cities' ? 'sm:col-span-2' : ''}
            >
              {field.type === 'subjects' && field.subjectListKey ? (
                <>
                  <SubjectListEditor
                    field={field}
                    rows={(form[field.subjectListKey] as SubjectEntry[] | undefined) ?? []}
                    onChange={rows => onSetField(field.subjectListKey!, rows)}
                    error={errorFor(field.id)}
                  />
                  {field.help && <p className='mt-2 text-[11px] text-muted-foreground'>{field.help}</p>}
                </>
              ) : (
                <FieldInput
                  field={field}
                  value={form[field.id]}
                  onChange={value => onSetField(field.id, value)}
                  error={errorFor(field.id)}
                />
              )}
            </div>
          )
        })}
      </div>

      {sectionStatus && !sectionStatus.done && (
        <p className='mt-3 text-[11px] text-amber-700'>
          Missing: {sectionStatus.missingLabels.join(', ')}
        </p>
      )}
    </section>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: ProfileSectionDef['fields'][number]
  value: unknown
  onChange: (value: unknown) => void
  error: string | null
}) {
  const displayName = labelForField(field.id)

  return (
    <div>
      <label htmlFor={'profile-field-' + field.id} className='block text-xs font-medium text-foreground mb-1'>
        {displayName}
        {field.required && <span className='text-destructive'> *</span>}
      </label>

      {field.type === 'select' && (
        <select
          id={'profile-field-' + field.id}
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          className={inputClassName}
        >
          <option value=''>Not entered yet</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}

      {(field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'date' || field.type === 'number' || field.type === 'address' || field.type === 'cities') && (
        <input
          id={'profile-field-' + field.id}
          // 'address' and 'cities' are our semantic types; they render as plain text inputs.
          type={field.type === 'address' || field.type === 'cities' ? 'text' : field.type}
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClassName}
        />
      )}

      {field.type !== 'select' && field.type !== 'subjects' && field.help && (
        <p className='mt-1 text-[11px] text-muted-foreground'>{field.help}</p>
      )}

      {error && <p className='mt-1 text-[11px] text-destructive'>{error}</p>}
    </div>
  )
}

function BooleanField({
  field,
  form,
  onSetField,
}: {
  field: ProfileSectionDef['fields'][number]
  form: Record<string, unknown>
  onSetField: (fieldId: string, value: unknown) => void
}) {
  const checked = form[field.id] === true
  return (
    <div className='sm:col-span-2'>
      <label
        htmlFor={'profile-field-' + field.id}
        className='flex items-start gap-2.5 px-3 py-2.5 border border-border rounded-lg bg-background cursor-pointer hover:bg-muted/40 transition-colors'
      >
        <input
          id={'profile-field-' + field.id}
          type='checkbox'
          checked={checked}
          onChange={e => onSetField(field.id, e.target.checked)}
          className='mt-0.5 h-4 w-4 accent-[#2563eb]'
        />
        <span className='text-sm text-foreground'>{field.label}</span>
      </label>
      {field.help && <p className='mt-1 text-[11px] text-muted-foreground'>{field.help}</p>}
    </div>
  )
}

function SubjectListEditor({
  field,
  rows,
  onChange,
  error,
}: {
  field: ProfileSectionDef['fields'][number]
  rows: SubjectEntry[]
  onChange: (rows: SubjectEntry[]) => void
  error: string | null
}) {
  return (
    <div>
      <div className='flex items-center justify-between mb-1'>
        <label className='text-xs font-medium text-foreground'>
          {field.label}
          {field.subjectRequired && <span className='text-destructive'> *</span>}
        </label>
        <button
          type='button'
          onClick={() => onChange([...rows, { name: '', kind: 'PERCENTAGE', value: '' }])}
          className='text-[11px] font-semibold text-primary hover:underline'
        >
          + Add subject
        </button>
      </div>

      {rows.length === 0 ? (
        <p className='px-3 py-2.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground'>
          {field.subjectRequired
            ? 'Add at least one subject — enter names and marks exactly as printed on your marksheet.'
            : 'No subjects added yet — add the ones you studied, with marks/grades as printed if you need them.'}
        </p>
      ) : (
        <ul className='space-y-2'>
          {rows.map((row, index) => (
            <li key={index} className='grid grid-cols-12 gap-2 items-center'>
              <input
                aria-label={'Subject ' + (index + 1) + ' name'}
                value={row.name}
                onChange={e => updateRow(rows, index, onChange, { name: e.target.value })}
                placeholder={'Subject ' + (index + 1) + ' name'}
                className={inputClassName + ' col-span-6 sm:col-span-5'}
              />
              <select
                aria-label={'Subject ' + (index + 1) + ' marks format'}
                value={row.kind}
                onChange={e => updateRow(rows, index, onChange, { kind: e.target.value as SubjectEntry['kind'] })}
                className={inputClassName + ' col-span-3'}
              >
                <option value='PERCENTAGE'>%</option>
                <option value='GRADE'>Grade</option>
                <option value='CGPA'>CGPA</option>
              </select>
              <input
                aria-label={'Subject ' + (index + 1) + ' marks or grade'}
                value={row.value}
                onChange={e => updateRow(rows, index, onChange, { value: e.target.value })}
                placeholder='Marks/grade (optional)'
                className={inputClassName + ' col-span-2 sm:col-span-3'}
              />
              <button
                type='button'
                aria-label={'Remove subject ' + (index + 1)}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className='col-span-1 text-muted-foreground hover:text-destructive justify-self-center px-1'
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className='mt-1 text-[11px] text-destructive'>{error}</p>}
    </div>
  )
}

function updateRow(
  rows: SubjectEntry[],
  index: number,
  onChange: (rows: SubjectEntry[]) => void,
  patch: Partial<SubjectEntry>
) {
  onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
}

/* ---------------- form (de)serialization helpers ---------------- */

export function draftToForm(profile: StudentProfileData): Record<string, unknown> {
  const form: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(profile)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue
    if (value === null) form[key] = key === 'pwdStatus' ? false : ''
    else if (key === 'class10Subjects' || key === 'class12Subjects') form[key] = value as SubjectEntry[]
    // Passing years are stored as numbers but edited as plain text inputs.
    else if (key === 'class10PassingYear' || key === 'class12PassingYear') form[key] = String(value)
    // Preferred cities are edited as a single comma-separated line.
    else if (key === 'preferredExamCities') form[key] = (value as string[]).join(', ')
    else form[key] = value
  }
  return form
}

export function formToPayload(form: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(form)) {
    if (key === 'class10Subjects' || key === 'class12Subjects') {
      const rows = (value as SubjectEntry[] | undefined) ?? []
      // Drop fully blank rows so an untouched template row never blocks saving.
      const meaningful = rows.filter(row => row.name.trim().length > 0 || row.value.trim().length > 0)
      payload[key] = meaningful
      continue
    }

    if (typeof value === 'string' && value.trim() === '') {
      payload[key] = ''
      continue
    }

    if (typeof value === 'string') {
      payload[key] = value.trim()
      continue
    }

    payload[key] = value
  }

  if (typeof payload.preferredExamCities === 'string') {
    payload.preferredExamCities = splitCityInput(payload.preferredExamCities)
  }

  return payload
}

export function labelForField(fieldId: string): string {
  for (const section of PROFILE_SECTIONS) {
    for (const field of section.fields) {
      if (field.id === fieldId) return field.label
    }
  }
  return fieldId.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}
