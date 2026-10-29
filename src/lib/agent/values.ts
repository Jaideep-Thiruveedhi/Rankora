import { AGENT_FILLABLE_SET, AGENT_MANUAL_ONLY_SET } from './fields'
import { prisma } from '@/lib/prisma'

/**
 * Apply Agent V1 — value resolution.
 *
 * Canonical field names in, concrete values out — resolved ONLY from the
 * student's own saved profile row of the paired workspace. The agent never
 * invents values: a canonical field with no saved value is reported as
 * "missing" so the extension leaves the form field untouched and tells the
 * student to fill it by hand.
 */

export interface AgentValuesResult {
  values: Record<string, string | boolean>
  missing: string[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MAX_REQUESTED_FIELDS = 30

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function derivedDobParts(iso: string | null): { day: string; month: string; year: string } | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  return {
    year: match[1],
    month: MONTH_NAMES[parseInt(match[2], 10) - 1] ?? '',
    day: match[3],
  }
}

function valueFromProfileRow(profile: Record<string, unknown>, field: string): string | boolean | null {
  switch (field) {
    case 'fullName':
    case 'email':
    case 'mobileNumber':
    case 'addressLine':
    case 'city':
    case 'pinCode':
    case 'class10Board':
    case 'class10RollNumber':
    case 'class10Marks':
    case 'class12Board':
    case 'class12RollNumber':
    case 'class12Marks':
      return stringOrEmpty(profile[field]) || null
    case 'gender':
    case 'state':
    case 'category':
    case 'class10MarksKind':
    case 'class12MarksKind':
    case 'homeState':
      return stringOrEmpty(profile[field]) || null
    case 'dateOfBirth':
      return stringOrEmpty(profile.dateOfBirth) || null
    case 'dateOfBirthDay':
    case 'dateOfBirthMonth':
    case 'dateOfBirthYear': {
      const parts = derivedDobParts(typeof profile.dateOfBirth === 'string' ? profile.dateOfBirth : null)
      if (!parts) return null
      if (field === 'dateOfBirthDay') return parts.day
      if (field === 'dateOfBirthMonth') return parts.month
      return parts.year
    }
    case 'class10PassingYear':
      return typeof profile.class10PassingYear === 'number' ? String(profile.class10PassingYear) : null
    case 'class12PassingYear':
      return typeof profile.class12PassingYear === 'number' ? String(profile.class12PassingYear) : null
    case 'pwdStatus':
      // Only ever CHECKED when the student marked PwD status; an unchecked
      // box is left exactly as the form has it.
      return profile.pwdStatus === true ? true : null
    case 'preferredExamCities': {
      if (!Array.isArray(profile.preferredExamCities)) return null
      const cities = profile.preferredExamCities.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      return cities.length > 0 ? cities.join(', ') : null
    }
    default:
      return null
  }
}

export async function resolveAgentValues(workspaceId: string, requested: unknown): Promise<AgentValuesResult> {
  const fields = (Array.isArray(requested) ? requested : [])
    .filter((f): f is string => typeof f === 'string')
    .filter(f => AGENT_FILLABLE_SET.has(f) && !AGENT_MANUAL_ONLY_SET.has(f))
    .slice(0, MAX_REQUESTED_FIELDS)

  const values: Record<string, string | boolean> = {}
  const missing: string[] = []
  if (fields.length === 0) return { values, missing }

  const profile = await prisma.studentProfile.findUnique({ where: { workspaceId } })
  if (!profile) {
    return { values, missing: [...fields] }
  }

  for (const field of fields) {
    const value = valueFromProfileRow(profile as unknown as Record<string, unknown>, field)
    if (value === null || value === '' || value === false) {
      missing.push(field)
    } else {
      values[field] = value
    }
  }

  return { values, missing }
}
