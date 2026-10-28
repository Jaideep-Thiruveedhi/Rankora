export type Category = 'GENERAL' | 'EWS' | 'OBC_NCL' | 'SC' | 'ST'
export type QuotaType = 'AIQ' | 'HS' | 'OS'
export type Gender = 'MALE' | 'FEMALE' | 'TRANSGENDER'
export type SeatType = 'OPEN' | 'OPEN_PWD' | 'GENDER_NEUTRAL' | 'FEMALE_ONLY'
export type RoundNumber = 1 | 2 | 3 | 4 | 5 | 6
export type Tier = 'SAFER' | 'POSSIBLE' | 'REACH' | 'UNLIKELY'
export type Trend = 'IMPROVING' | 'STABLE' | 'DECLINING'

export interface PredictionInput {
  jeeRank?: number
  jeePercentile?: number
  category: Category
  quota: QuotaType
  homeState: string
  gender: Gender
  targetYear: number
  targetRound: RoundNumber
  preferredBranches?: string[]
  preferredInstitutes?: string[]
  preferredStates?: string[]
  instituteTypes?: string[]
  minNirfRank?: number
  maxNirfRank?: number
}

export interface InstituteSummary {
  id: string
  code: string
  name: string
  shortName: string | null
  type: string
  state: string
  city: string
  nirfRank: number | null
}

export interface BranchSummary {
  id: string
  code: string
  name: string
}

export interface CutoffData {
  openingRank: number | null
  closingRank: number | null
  year: number
  round: number
}

export interface BranchPrediction {
  branch: BranchSummary
  cutoff: CutoffData
  tier: Tier
  confidence: number
  trend: Trend
  reason: string
}

export interface InstitutePrediction {
  institute: InstituteSummary
  branches: BranchPrediction[]
}

export interface PredictionStats {
  totalOptions: number
  saferCount: number
  possibleCount: number
  reachCount: number
}

export interface PredictionMetadata {
  input: PredictionInput
  year: number
  round: number
  generatedAt: string
  disclaimer: string
}

export interface PredictionResult {
  metadata: PredictionMetadata
  results: InstitutePrediction[]
  stats: PredictionStats
}