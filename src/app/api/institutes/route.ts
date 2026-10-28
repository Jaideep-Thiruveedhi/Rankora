import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const state = searchParams.get('state')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: Prisma.InstituteWhereInput = {}
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { code: { contains: query, mode: 'insensitive' } },
      { shortName: { contains: query, mode: 'insensitive' } },
    ]
  }
  if (state) where.state = state
  if (type) where.type = type

  const institutes = await prisma.institute.findMany({
    where,
    take: limit,
    orderBy: [{ nirfRank: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      type: true,
      state: true,
      city: true,
      nirfRank: true,
    },
  })

  return NextResponse.json(institutes)
}