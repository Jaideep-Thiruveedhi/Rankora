import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { WORKSPACE_COOKIE, readWorkspaceToken } from '@/lib/apply-ai/workspace'
import { parseProfileDraft } from '@/lib/apply-ai/validation'
import { evaluateProfile } from '@/lib/apply-ai/requirements'
import type { StudentProfileData, SubjectEntry } from '@/lib/apply-ai/types'

type ProfileRow = Awaited<ReturnType<typeof prisma.studentProfile.findUnique>>

function toDTO(row: ProfileRow): StudentProfileData {
  if (!row) throw new Error('Profile row missing')
  return {
    id: row.id,
    fullName: row.fullName ?? null,
    gender: row.gender ?? null,
    dateOfBirth: row.dateOfBirth ?? null,
    email: row.email ?? null,
    mobileNumber: row.mobileNumber ?? null,
    addressLine: row.addressLine ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    pinCode: row.pinCode ?? null,
    class10Board: row.class10Board ?? null,
    class10PassingYear: row.class10PassingYear ?? null,
    class10RollNumber: row.class10RollNumber ?? null,
    class10MarksKind: row.class10MarksKind ?? null,
    class10Marks: row.class10Marks ?? null,
    class10Subjects: (row.class10Subjects as SubjectEntry[] | null) ?? null,
    class12Board: row.class12Board ?? null,
    class12PassingYear: row.class12PassingYear ?? null,
    class12RollNumber: row.class12RollNumber ?? null,
    class12MarksKind: row.class12MarksKind ?? null,
    class12Marks: row.class12Marks ?? null,
    class12Subjects: (row.class12Subjects as SubjectEntry[] | null) ?? null,
    category: row.category ?? null,
    pwdStatus: row.pwdStatus,
    homeState: row.homeState ?? null,
    preferredExamCities: (row.preferredExamCities as string[] | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function requireWorkspace(): Promise<string | null> {
  const cookieStore = await cookies()
  return readWorkspaceToken(cookieStore.get(WORKSPACE_COOKIE)?.value)
}

export async function GET() {
  const workspaceId = await requireWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised' }, { status: 401 })
  }

  const row = await prisma.studentProfile.findUnique({ where: { workspaceId } })
  const profile = row ? toDTO(row) : null
  return NextResponse.json({
    profile,
    evaluation: evaluateProfile(profile),
  })
}

/** Accepts any JSON object; every field is validated individually (draft mode). */
const objectSchema = z.record(z.string(), z.unknown())

export async function PUT(request: NextRequest) {
  const workspaceId = await requireWorkspace()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not initialised' }, { status: 401 })
  }

  let raw: Record<string, unknown>
  try {
    const body: unknown = await request.json()
    const parsed = objectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    raw = parsed.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Draft-mode parsing: valid fields are accepted, invalid fields are reported.
  const { accepted, invalidFields } = parseProfileDraft(raw)

  const data = applyAcceptedFields(accepted)
  const existing = await prisma.studentProfile.findUnique({ where: { workspaceId } })

  const row = existing
    ? await prisma.studentProfile.update({ where: { workspaceId }, data: data.update })
    : await prisma.studentProfile.create({
        data: { ...data.update, workspaceId } as Prisma.StudentProfileUncheckedCreateInput,
      })

  const profile = toDTO(row)
  return NextResponse.json({
    profile,
    evaluation: evaluateProfile(profile),
    invalidFields,
    savedAt: new Date().toISOString(),
  })
}

/**
 * Maps validated draft fields onto typed Prisma update input. Null values clear
 * the field only because the draft explicitly contained an empty value.
 */
function applyAcceptedFields(accepted: Record<string, unknown>): {
  update: Prisma.StudentProfileUncheckedUpdateInput
} {
  const update: Record<string, unknown> = {}

  for (const [field, value] of Object.entries(accepted)) {
    switch (field) {
      case 'class10PassingYear':
      case 'class12PassingYear':
        // zod validated a 4-digit year STRING; the Prisma column is Int.
        update[field] = parseInt(value as string, 10)
        break
      case 'pwdStatus':
        update[field] = Boolean(value)
        break
      case 'class10Subjects':
      case 'class12Subjects':
        update[field] = value as Prisma.InputJsonValue
        break
      case 'preferredExamCities':
        update[field] = value as Prisma.InputJsonValue
        break
      default:
        update[field] = value
    }
  }

  return { update: update as Prisma.StudentProfileUncheckedUpdateInput }
}
