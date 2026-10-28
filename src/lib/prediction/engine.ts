import { prisma } from '@/lib/prisma'
import type {
  PredictionInput,
  PredictionResult,
  InstitutePrediction,
  BranchPrediction,
  InstituteSummary,
  BranchSummary,
  CutoffData,
  Tier,
  Trend,
  PredictionStats,
  PredictionMetadata,
} from './types'

const SAFER_THRESHOLD = 0.8
const POSSIBLE_THRESHOLD = 1.0
const REACH_THRESHOLD = 1.2

type RoundNumber = 1 | 2 | 3 | 4 | 5 | 6
type PrismaRoundNumber = 'ROUND_1' | 'ROUND_2' | 'ROUND_3' | 'ROUND_4' | 'ROUND_5' | 'ROUND_6'

const roundMap: Record<RoundNumber, PrismaRoundNumber> = { 
  1: 'ROUND_1', 
  2: 'ROUND_2', 
  3: 'ROUND_3', 
  4: 'ROUND_4', 
  5: 'ROUND_5', 
  6: 'ROUND_6' 
}

const roundMapString: Record<number, PrismaRoundNumber> = { 
  1: 'ROUND_1', 
  2: 'ROUND_2', 
  3: 'ROUND_3', 
  4: 'ROUND_4', 
  5: 'ROUND_5', 
  6: 'ROUND_6' 
}

export async function getPercentileRankMapping(year: number, percentile: number): Promise<number> {
  const yearRecord = await prisma.academicYear.findUnique({ where: { year } })
  if (!yearRecord) return Math.round(1000000 * (1 - percentile / 100))
  const mapping = await prisma.percentileRankMapping.findFirst({
    where: { yearId: yearRecord.id, percentile: { lte: percentile } },
    orderBy: { percentile: 'desc' },
  })
  return mapping?.rank ?? Math.round(1000000 * (1 - percentile / 100))
}

export function calculateTier(studentRank: number, closingRank: number | null): Tier {
  if (!closingRank) return 'UNLIKELY'
  const ratio = studentRank / closingRank
  if (ratio <= SAFER_THRESHOLD) return 'SAFER'
  if (ratio <= POSSIBLE_THRESHOLD) return 'POSSIBLE'
  if (ratio <= REACH_THRESHOLD) return 'REACH'
  return 'UNLIKELY'
}

export function calculateConfidence(studentRank: number, closingRank: number | null): number {
  if (!closingRank) return 0
  const ratio = studentRank / closingRank
  if (ratio <= 0.5) return 95
  if (ratio <= 0.8) return 80
  if (ratio <= 1.0) return 60
  if (ratio <= 1.2) return 35
  if (ratio <= 1.5) return 15
  return 5
}

export function calculateTrend(currentClosing: number | null, previousClosing: number | null): Trend {
  if (!currentClosing || !previousClosing) return 'STABLE'
  const change = (currentClosing - previousClosing) / previousClosing
  if (change > 0.05) return 'DECLINING'
  if (change < -0.05) return 'IMPROVING'
  return 'STABLE'
}

export function generateReason(
  studentRank: number,
  cutoff: CutoffData
): string {
  if (!cutoff.closingRank) {
    return 'No closing rank data available for ' + cutoff.year + ' Round ' + cutoff.round
  }
  const diff = studentRank - cutoff.closingRank
  const direction = diff > 0 ? 'worse than' : 'better than'
  return 'Your rank ' + studentRank.toLocaleString() + ' is ' + Math.abs(diff).toLocaleString() + ' ' + direction + ' ' + cutoff.year + ' Round ' + cutoff.round + ' closing (' + cutoff.closingRank.toLocaleString() + ')'
}

export async function predictColleges(input: PredictionInput): Promise<PredictionResult> {
  const yearRecord = await prisma.academicYear.findUnique({ where: { year: input.targetYear } })
  if (!yearRecord) throw new Error('Academic year ' + input.targetYear + ' not found')

  const roundRecord = await prisma.counsellingRound.findFirst({
    where: { yearId: yearRecord.id, roundNo: roundMap[input.targetRound] },
  })
  if (!roundRecord) throw new Error('Round ' + input.targetRound + ' not found for year ' + input.targetYear)

  const categoryQuotas = await prisma.categoryQuota.findMany({
    where: {
      category: input.category,
      quota: input.quota,
      gender: input.gender,
      seatType: { in: ['OPEN', 'GENDER_NEUTRAL', 'FEMALE_ONLY'] },
    },
  })
  const categoryQuotaIds = categoryQuotas.map(cq => cq.id)

  let studentRank = input.jeeRank
  if (!studentRank && input.jeePercentile) {
    studentRank = await getPercentileRankMapping(input.targetYear, input.jeePercentile)
  }
  if (!studentRank) throw new Error('Either jeeRank or jeePercentile must be provided')

  const cutoffs = await prisma.cutoff.findMany({
    where: {
      yearId: yearRecord.id,
      roundId: roundRecord.id,
      categoryQuotaId: { in: categoryQuotaIds },
      closingRank: { not: null },
    },
    include: {
      institute: true,
      branch: true,
      categoryQuota: true,
    },
    orderBy: { closingRank: 'asc' },
  })

  const previousYearRecord = await prisma.academicYear.findUnique({ where: { year: input.targetYear - 1 } })
  const previousCutoffs = new Map<string, number>()
  if (previousYearRecord) {
    const prevRound = await prisma.counsellingRound.findFirst({
      where: { yearId: previousYearRecord.id, roundNo: roundMapString[input.targetRound] },
    })
    if (prevRound) {
      const prev = await prisma.cutoff.findMany({
        where: { yearId: previousYearRecord.id, roundId: prevRound.id, categoryQuotaId: { in: categoryQuotaIds } },
        select: { instituteId: true, branchId: true, closingRank: true },
      })
      for (const p of prev) {
        if (p.closingRank) previousCutoffs.set(p.instituteId + '-' + p.branchId, p.closingRank)
      }
    }
  }

  const instituteMap = new Map<string, InstitutePrediction>()

  for (const cutoff of cutoffs) {
    const { institute, branch, closingRank, openingRank } = cutoff
    
    if (input.preferredBranches?.length && !input.preferredBranches.includes(branch.code)) continue
    if (input.preferredInstitutes?.length && !input.preferredInstitutes.includes(institute.code)) continue
    if (input.preferredStates?.length && !input.preferredStates.includes(institute.state)) continue
    if (input.instituteTypes?.length && !input.instituteTypes.includes(institute.type)) continue
    if (input.minNirfRank && institute.nirfRank && institute.nirfRank < input.minNirfRank) continue
    if (input.maxNirfRank && institute.nirfRank && institute.nirfRank > input.maxNirfRank) continue

    const tier = calculateTier(studentRank, closingRank!)
    if (tier === 'UNLIKELY') continue

    const prevClosing = previousCutoffs.get(institute.id + '-' + branch.id)
    const trend = calculateTrend(closingRank, prevClosing ?? null)
    const confidence = calculateConfidence(studentRank, closingRank)
    const reason = generateReason(studentRank, { openingRank, closingRank, year: input.targetYear, round: input.targetRound })

    const branchSummary: BranchSummary = { id: branch.id, code: branch.code, name: branch.name }
    const branchPrediction: BranchPrediction = {
      branch: branchSummary,
      cutoff: { openingRank, closingRank, year: input.targetYear, round: input.targetRound },
      tier,
      confidence,
      trend,
      reason,
    }

    const instKey = institute.id
    if (!instituteMap.has(instKey)) {
      const instituteSummary: InstituteSummary = {
        id: institute.id,
        code: institute.code,
        name: institute.name,
        shortName: institute.shortName,
        type: institute.type,
        state: institute.state,
        city: institute.city,
        nirfRank: institute.nirfRank,
      }
      instituteMap.set(instKey, { institute: instituteSummary, branches: [] })
    }
    instituteMap.get(instKey)!.branches.push(branchPrediction)
  }

  const results = Array.from(instituteMap.values())
  
  for (const inst of results) {
    inst.branches.sort((a, b) => {
      const tierOrder: Record<Tier, number> = { SAFER: 0, POSSIBLE: 1, REACH: 2, UNLIKELY: 3 }
      if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier]
      return (a.cutoff.closingRank ?? 999999) - (b.cutoff.closingRank ?? 999999)
    })
  }

  results.sort((a, b) => {
    const aBest = a.branches[0]?.tier ?? 'UNLIKELY'
    const bBest = b.branches[0]?.tier ?? 'UNLIKELY'
    const tierOrder: Record<Tier, number> = { SAFER: 0, POSSIBLE: 1, REACH: 2, UNLIKELY: 3 }
    if (tierOrder[aBest] !== tierOrder[bBest]) return tierOrder[aBest] - tierOrder[bBest]
    const aRank = a.branches[0]?.cutoff.closingRank ?? 999999
    const bRank = b.branches[0]?.cutoff.closingRank ?? 999999
    return aRank - bRank
  })

  const stats: PredictionStats = {
    totalOptions: results.reduce((sum, i) => sum + i.branches.length, 0),
    saferCount: results.reduce((sum, i) => sum + i.branches.filter(b => b.tier === 'SAFER').length, 0),
    possibleCount: results.reduce((sum, i) => sum + i.branches.filter(b => b.tier === 'POSSIBLE').length, 0),
    reachCount: results.reduce((sum, i) => sum + i.branches.filter(b => b.tier === 'REACH').length, 0),
  }

  const metadata: PredictionMetadata = {
    input,
    year: input.targetYear,
    round: input.targetRound,
    generatedAt: new Date().toISOString(),
    disclaimer: 'Predictions based on JOSSA ' + input.targetYear + ' Round ' + input.targetRound + ' historical data. Not a guarantee of admission.',
  }

  return { metadata, results, stats }
}