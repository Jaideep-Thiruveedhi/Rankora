import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import {
  AGENT_FILLABLE_SET,
  AGENT_MANUAL_ONLY_SET,
  matchFieldDeterministically,
  type AgentMappingCandidate,
  type AgentTargetStatus,
  type OptionPair,
} from './fields'
import { mapFieldsWithOllama } from './ollama'
import { prisma } from '@/lib/prisma'

/**
 * Apply Agent V1 — fill-plan builder.
 *
 * Tier 1 is the pure deterministic alias engine (fields.ts). Tier 2 consults
 * the configured local Ollama model ONLY for descriptors the deterministic
 * engine left unmapped, passing labels/option labels + the canonical allowlist
 * — never student data, never field values. Model output is validated against
 * the allowlist and can only approve pre-approved canonical names, so model
 * output can never broaden what the agent is allowed to fill.
 */

export const agentFieldDescriptorSchema = z.object({
  index: z.number().int().min(0).max(150),
  label: z.string().max(240).default(''),
  kind: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'number', 'email', 'tel', 'file']),
  inputName: z.string().max(150).default(''),
  inputId: z.string().max(150).default(''),
  required: z.boolean().default(false),
  inputType: z.string().max(20).optional(),
  autocomplete: z.string().max(20).optional(),
  options: z
    .array(
      z.object({
        text: z.string().max(150),
        value: z.string().max(150).default(''),
      })
    )
    .max(80)
    .default([]),
})

export type AgentFieldDescriptor = z.infer<typeof agentFieldDescriptorSchema>

export const agentMapRequestSchema = z.object({
  fields: z.array(agentFieldDescriptorSchema).min(1).max(120),
})

/** The kinds the deterministic engine + AI tier map. File/hidden/password
 * inputs never reach this module (the content script filters them first; the
 * unsafe-field guard re-checks here). */
const AI_ELIGIBLE_KINDS: ReadonlySet<string> = new Set([
  'text',
  'textarea',
  'select',
  'radio',
  'date',
  'number',
])

export interface AgentPlanItem {
  index: number
  label: string
  kind: string
  required: boolean
  status: AgentTargetStatus
  canonical: string | null
  ambiguous: string[]
  needsReview: boolean
  reason: string
  firedByAi: boolean
}

export interface AgentFillPlan {
  createdAt: string
  aiUsed: boolean
  aiNote: string | null
  counts: {
    detected: number
    mapped: number
    ambiguous: number
    manual: number
    unsafe: number
    unmapped: number
  }
  items: AgentPlanItem[]
}

interface PendingAiDescriptor {
  descriptor: AgentFieldDescriptor
  candidate: AgentMappingCandidate
}

function optionPairsOf(descriptor: AgentFieldDescriptor): OptionPair[] {
  return descriptor.options.map(o => ({ text: o.text, value: o.value ?? '' }))
}

/**
 * Builds the redacted fill plan for one detection round. Identifiers
 * (inputName/inputId) are kept OUT of the stored plan: the page preview shows
 * labels/status only, and the plan never contains student values.
 */
export async function buildAgentFillPlan(descriptors: AgentFieldDescriptor[]): Promise<AgentFillPlan> {
  const decisions: { descriptor: AgentFieldDescriptor; candidate: AgentMappingCandidate; firedByAi: boolean }[] = []
  const pendingAi: PendingAiDescriptor[] = []

  for (const descriptor of descriptors) {
    const candidate = matchFieldDeterministically({
      kind: descriptor.kind,
      label: descriptor.label,
      inputName: descriptor.inputName,
      inputId: descriptor.inputId,
      required: descriptor.required,
      options: optionPairsOf(descriptor),
      inputType: descriptor.inputType,
      autocomplete: descriptor.autocomplete,
    })

    const eligibleForAi =
      candidate.status === 'unmapped' &&
      AI_ELIGIBLE_KINDS.has(descriptor.kind) &&
      descriptor.label.trim().length > 0

    if (eligibleForAi) {
      pendingAi.push({ descriptor, candidate })
      decisions.push({ descriptor, candidate, firedByAi: false })
    } else {
      decisions.push({ descriptor, candidate, firedByAi: false })
    }
  }

  let aiUsed = false
  let aiNote: string | null = null

  if (pendingAi.length > 0) {
    const aiResult = await mapFieldsWithOllama(pendingAi.map(p => p.descriptor))
    aiUsed = aiResult.aiUsed
    aiNote = aiResult.aiNote
    for (const aiMap of aiResult.suggestions) {
      const found = decisions.find(d => d.descriptor.index === aiMap.index)
      if (found && found.candidate.status === 'unmapped') {
        // Model-suggested mappings always start UNCHECKED in the popup: the
        // student reviews them explicitly before anything is filled.
        found.candidate = { status: 'mapped', canonical: aiMap.canonical, ambiguous: [], needsReview: true, reason: 'Mapped by the local Ollama model (labels only) — review before approving' }
        found.firedByAi = true
      }
    }
  }

  const items: AgentPlanItem[] = decisions.map(({ descriptor, candidate, firedByAi }) => ({
    index: descriptor.index,
    label: descriptor.label || '(no label detected)',
    kind: descriptor.kind,
    required: descriptor.required,
    status: candidate.status === 'unmapped' && descriptor.label.trim().length === 0 ? 'manual' : candidate.status,
    canonical: candidate.canonical,
    ambiguous: candidate.ambiguous,
    needsReview: candidate.needsReview,
    reason: candidate.reason,
    firedByAi,
  }))

  const counts = {
    detected: items.length,
    mapped: items.filter(i => i.status === 'mapped').length,
    ambiguous: items.filter(i => i.status === 'ambiguous').length,
    manual: items.filter(i => i.status === 'manual').length,
    unsafe: items.filter(i => i.status === 'unsafe').length,
    unmapped: items.filter(i => i.status === 'unmapped').length,
  }

  return {
    createdAt: new Date().toISOString(),
    aiUsed,
    aiNote,
    counts,
    items,
  }
}

/** Caches the latest plan on every currently-valid session of the workspace so
 * the /apply/agent page can preview what the extension detected. */
export async function persistAgentPlan(workspaceId: string, plan: AgentFillPlan): Promise<void> {
  await prisma.agentSession.updateMany({
    where: { workspaceId, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { plan: plan as unknown as Prisma.InputJsonValue, planAt: new Date() },
  })
}
