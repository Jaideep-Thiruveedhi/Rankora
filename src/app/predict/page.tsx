'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

const predictionSchema = z.object({
  jeeRank: z.number().int().positive().optional(),
  jeePercentile: z.number().min(0).max(100).optional(),
  category: z.enum(['GENERAL', 'EWS', 'OBC_NCL', 'SC', 'ST']),
  quota: z.enum(['AIQ', 'HS', 'OS']),
  homeState: z.string().min(1),
  gender: z.enum(['MALE', 'FEMALE', 'TRANSGENDER']),
  targetYear: z.number().int().min(2015).max(2030),
  targetRound: z.number().int().min(1).max(6),
  preferredBranches: z.array(z.string()).optional(),
  preferredInstitutes: z.array(z.string()).optional(),
  preferredStates: z.array(z.string()).optional(),
  instituteTypes: z.array(z.string()).optional(),
  minNirfRank: z.number().int().positive().optional(),
  maxNirfRank: z.number().int().positive().optional(),
}).refine(data => data.jeeRank || data.jeePercentile, {
  message: 'Either rank or percentile must be provided',
  path: ['jeeRank'],
})

type FormData = z.infer<typeof predictionSchema>

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

const INSTITUTE_TYPES = ['IIT', 'NIT', 'IIIT', 'GFTI']

const BRANCHES = [
  'CS', 'IT', 'EC', 'EE', 'ME', 'CE', 'CH', 'BT', 'MT', 'PE',
  'AE', 'NE', 'MI', 'PI', 'TT', 'CT', 'EP', 'EN', 'BM', 'CY',
]

export default function PredictPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    category: 'GENERAL',
    quota: 'AIQ',
    homeState: '',
    gender: 'MALE',
    targetYear: 2024,
    targetRound: 6,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const mutate = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Prediction failed')
      }
      return res.json()
    },
    onSuccess: (result) => {
      const params = new URLSearchParams()
      params.set('data', JSON.stringify(result))
      router.push('/results?' + params.toString())
    },
    onError: (error: Error) => {
      setErrors({ jeeRank: error.message })
    },
  })

  const validateStep = (): boolean => {
    const stepSchema = step === 1
      ? predictionSchema.pick({ jeeRank: true, jeePercentile: true, category: true, quota: true, homeState: true, gender: true })
      : step === 2
      ? predictionSchema.pick({ targetYear: true, targetRound: true })
      : predictionSchema
    
    const result = stepSchema.safeParse(formData)
    if (!result.success) {
      const newErrors: Partial<Record<keyof FormData, string>> = {}
      result.error.issues.forEach((e: z.ZodIssue) => {
        if (e.path[0]) newErrors[e.path[0] as keyof FormData] = e.message
      })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateStep()) {
      if (step < 3) setStep(s => s + 1)
      else mutate.mutate(formData)
    }
  }

  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const steps = [
    { num: 1, label: 'Profile', desc: 'JEE rank, category, quota, state, gender' },
    { num: 2, label: 'Target', desc: 'Year and round for prediction' },
    { num: 3, label: 'Preferences', desc: 'Optional filters for branches, institutes, states' },
  ]

  return (
    <div className='min-h-screen bg-gray-50 py-12 px-4'>
      <div className='max-w-3xl mx-auto'>
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-foreground'>College Prediction</h1>
          <p className='text-muted-foreground mt-2'>Step {step} of 3</p>
        </div>

        <div className='mb-8 flex items-center justify-center gap-2'>
          {steps.map((s, i) => (
            <div key={s.num} className='flex items-center gap-2'>
              <div className={'w-10 h-10 rounded-full flex items-center justify-center font-semibold ' +
                (i + 1 < step ? 'bg-primary text-primary-foreground' :
                i + 1 === step ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground')}>
                {s.num}
              </div>
              {i < steps.length - 1 && (
                <div className={'w-16 h-0.5 ' +
                  (i + 1 < step ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className='bg-background border border-border rounded-xl p-6 sm:p-8'>
          <div className='mb-6'>
            <h2 className='text-lg font-semibold text-foreground mb-2'>{steps[step - 1].label}</h2>
            <p className='text-sm text-muted-foreground'>{steps[step - 1].desc}</p>
          </div>

          {step === 1 && (
            <div className='space-y-6'>
              <div className='grid sm:grid-cols-2 gap-4'>
                <FormField
                  label='JEE Main Rank'
                  error={errors.jeeRank}
                  help='Enter your All India Rank (AIR)'
                >
                  <input
                    type='number'
                    min='1'
                    max='1000000'
                    value={formData.jeeRank || ''}
                    onChange={e => handleChange('jeeRank', e.target.value ? parseInt(e.target.value) : undefined)}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                    placeholder='e.g., 15000'
                  />
                </FormField>
                <FormField
                  label='JEE Main Percentile'
                  error={errors.jeePercentile}
                  help='Alternative to rank (0-100)'
                >
                  <input
                    type='number'
                    min='0'
                    max='100'
                    step='0.01'
                    value={formData.jeePercentile || ''}
                    onChange={e => handleChange('jeePercentile', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                    placeholder='e.g., 99.5'
                  />
                </FormField>
              </div>

              <div className='grid sm:grid-cols-2 gap-4'>
                <FormField label='Category' error={errors.category}>
                  <select
                    value={formData.category}
                    onChange={e => handleChange('category', e.target.value as FormData['category'])}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                  >
                    <option value='GENERAL'>General</option>
                    <option value='EWS'>EWS</option>
                    <option value='OBC_NCL'>OBC-NCL</option>
                    <option value='SC'>SC</option>
                    <option value='ST'>ST</option>
                  </select>
                </FormField>
                <FormField label='Gender' error={errors.gender}>
                  <select
                    value={formData.gender}
                    onChange={e => handleChange('gender', e.target.value as FormData['gender'])}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                  >
                    <option value='MALE'>Male</option>
                    <option value='FEMALE'>Female</option>
                    <option value='TRANSGENDER'>Transgender</option>
                  </select>
                </FormField>
              </div>

              <div className='grid sm:grid-cols-2 gap-4'>
                <FormField label='Home State' error={errors.homeState}>
                  <select
                    value={formData.homeState}
                    onChange={e => handleChange('homeState', e.target.value)}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                  >
                    <option value=''>Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label='Quota' error={errors.quota}>
                  <select
                    value={formData.quota}
                    onChange={e => handleChange('quota', e.target.value as FormData['quota'])}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                  >
                    <option value='AIQ'>All India Quota (AIQ)</option>
                    <option value='HS'>Home State (HS)</option>
                    <option value='OS'>Other State (OS)</option>
                  </select>
                </FormField>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className='space-y-6'>
              <div className='grid sm:grid-cols-2 gap-4'>
                <FormField label='Target Year' error={errors.targetYear}>
                  <select
                    value={formData.targetYear}
                    onChange={e => handleChange('targetYear', parseInt(e.target.value))}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                  >
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                  </select>
                </FormField>
                <FormField label='Target Round' error={errors.targetRound}>
                  <select
                    value={formData.targetRound}
                    onChange={e => handleChange('targetRound', parseInt(e.target.value))}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                  >
                    <option value={1}>Round 1</option>
                    <option value={2}>Round 2</option>
                    <option value={3}>Round 3</option>
                    <option value={4}>Round 4</option>
                    <option value={5}>Round 5</option>
                    <option value={6}>Round 6 (Final)</option>
                  </select>
                </FormField>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className='space-y-6'>
              <div>
                <FormField label='Preferred Branches (optional)'>
                  <MultiSelect
                    options={BRANCHES}
                    values={formData.preferredBranches || []}
                    onChange={values => handleChange('preferredBranches', values)}
                    placeholder='Select branches (e.g., CS, EE, ME)'
                  />
                </FormField>
              </div>
              <div>
                <FormField label='Institute Types (optional)'>
                  <MultiSelect
                    options={INSTITUTE_TYPES}
                    values={formData.instituteTypes || []}
                    onChange={values => handleChange('instituteTypes', values)}
                    placeholder='Select types (IIT, NIT, IIIT, GFTI)'
                  />
                </FormField>
              </div>
              <div>
                <FormField label='Preferred States (optional)'>
                  <MultiSelect
                    options={STATES}
                    values={formData.preferredStates || []}
                    onChange={values => handleChange('preferredStates', values)}
                    placeholder='Select states'
                  />
                </FormField>
              </div>
              <div className='grid sm:grid-cols-2 gap-4'>
                <FormField label='Min NIRF Rank (optional)'>
                  <input
                    type='number'
                    min='1'
                    max='100'
                    value={formData.minNirfRank || ''}
                    onChange={e => handleChange('minNirfRank', e.target.value ? parseInt(e.target.value) : undefined)}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                    placeholder='e.g., 10'
                  />
                </FormField>
                <FormField label='Max NIRF Rank (optional)'>
                  <input
                    type='number'
                    min='1'
                    max='100'
                    value={formData.maxNirfRank || ''}
                    onChange={e => handleChange('maxNirfRank', e.target.value ? parseInt(e.target.value) : undefined)}
                    className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
                    placeholder='e.g., 50'
                  />
                </FormField>
              </div>
            </div>
          )}

          <div className='flex justify-between mt-8 pt-6 border-t border-border'>
            {step > 1 && (
              <button
                type='button'
                onClick={() => setStep(s => s - 1)}
                className='px-6 py-2.5 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors'
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type='submit'
                className='px-6 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors'
              >
                Next
              </button>
            ) : (
              <button
                type='submit'
                disabled={mutate.isPending}
                className='px-8 py-3 text-base font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {mutate.isPending ? 'Predicting...' : 'Get Predictions'}
              </button>
            )}
          </div>
        </form>

        <div className='mt-6 text-center text-sm text-muted-foreground'>
          <p>Predictions based on JOSSA historical cutoff data. Not a guarantee of admission.</p>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, error, help, children }: { label: string; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className='block text-sm font-medium text-foreground mb-1.5'>{label}</label>
      {children}
      {error && <p className='mt-1.5 text-sm text-destructive'>{error}</p>}
      {help && !error && <p className='mt-1.5 text-sm text-muted-foreground'>{help}</p>}
    </div>
  )
}

function MultiSelect({ options, values, onChange, placeholder }: { options: string[]; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  return (
    <div className='relative'>
      <div className='flex flex-wrap gap-2 min-h-[44px] px-4 py-2.5 border border-border rounded-lg bg-background'>
        {values.map(v => (
          <span key={v} className='inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full'>
            {v}
            <button type='button' onClick={() => onChange(values.filter(x => x !== v))} className='hover:text-primary/70'>×</button>
          </span>
        ))}
        <select
          className='flex-1 min-w-[120px] bg-transparent border-none focus:outline-none text-sm text-foreground'
          onChange={e => {
            const val = e.target.value
            if (val && !values.includes(val)) onChange([...values, val])
            e.target.value = ''
          }}
        >
          <option value='' disabled>{values.length === 0 ? placeholder : 'Add more...'}</option>
          {options.filter(o => !values.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  )
}