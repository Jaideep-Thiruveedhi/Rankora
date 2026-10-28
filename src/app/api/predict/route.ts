import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { predictColleges } from '@/lib/prediction/engine'

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
  message: 'Either jeeRank or jeePercentile must be provided',
  path: ['jeeRank'],
})

type RoundNumber = 1 | 2 | 3 | 4 | 5 | 6

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = predictionSchema.parse(body)
    
    const result = await predictColleges({
      ...input,
      targetRound: input.targetRound as RoundNumber,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Prediction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}