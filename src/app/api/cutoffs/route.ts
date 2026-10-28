import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Category = 'GENERAL' | 'EWS' | 'OBC_NCL' | 'SC' | 'ST'
type Quota = 'AIQ' | 'HS' | 'OS'
type Gender = 'MALE' | 'FEMALE' | 'TRANSGENDER'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const instituteCode = searchParams.get('institute')
  const branchCode = searchParams.get('branch')
  const category = searchParams.get('category') as Category | null
  const quota = searchParams.get('quota') as Quota | null
  const gender = searchParams.get('gender') as Gender | null
  const year = searchParams.get('year')

  if (!instituteCode || !branchCode || !category || !quota || !gender) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  const institute = await prisma.institute.findUnique({ where: { code: instituteCode } })
  if (!institute) return NextResponse.json({ error: 'Institute not found' }, { status: 404 })

  const branch = await prisma.branch.findFirst({ where: { instituteId: institute.id, code: branchCode } })
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

  const categoryQuota = await prisma.categoryQuota.findUnique({
    where: { category_quota_gender_seatType: { category, quota, gender, seatType: 'OPEN' } },
  })
  if (!categoryQuota) return NextResponse.json({ error: 'Category/Quota/Gender combination not found' }, { status: 404 })

  const where: Prisma.CutoffWhereInput = {
    instituteId: institute.id,
    branchId: branch.id,
    categoryQuotaId: categoryQuota.id,
  }
  if (year) where.year = { year: parseInt(year) }

  const cutoffs = await prisma.cutoff.findMany({
    where,
    include: { year: true, round: true },
    orderBy: [{ year: { year: 'asc' } }, { round: { roundNo: 'asc' } }],
  })

  const history = cutoffs.map(c => ({
    year: c.year.year,
    round: c.round.roundNo,
    openingRank: c.openingRank,
    closingRank: c.closingRank,
    openingPercentile: c.openingPercentile,
    closingPercentile: c.closingPercentile,
  }))

  return NextResponse.json({ institute: instituteCode, branch: branchCode, history })
}