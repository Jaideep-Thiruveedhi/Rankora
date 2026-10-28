import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const institute = await prisma.institute.findUnique({
    where: { code },
    include: {
      branches: {
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      },
    },
  })

  if (!institute) {
    return NextResponse.json({ error: 'Institute not found' }, { status: 404 })
  }

  return NextResponse.json(institute)
}