'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import type { InvalidField } from './validation'
import type { ProfileEvaluation } from './requirements'
import type { StudentProfileData, UploadedDocumentDTO, DocumentId } from './types'

interface ProfileResponse {
  profile: StudentProfileData | null
  evaluation: ProfileEvaluation
}

export interface ProfileSaveResponse extends ProfileResponse {
  invalidFields: InvalidField[]
  savedAt: string
}

export type ProfileSaveError = Error & { invalidFields?: InvalidField[] }

async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export type WorkspaceStatus =
  | 'existing' // signed out: the cookie already holds an unclaimed workspace
  | 'created' // a fresh workspace was minted (anonymous, or owned when signed in)
  | 'owned' // signed in: everything resolves to the account's workspace
  | 'claimable' // signed in, nothing owned, but this browser holds an unclaimed workspace
  | 'unavailable' // signed out: the cookie's workspace is claimed by some account

/**
 * Creates/reads the Apply AI workspace. Must complete before profile or
 * document queries run for signed-out visitors — and for signed-in users it
 * resolves (or mints) an account-owned workspace. The token value never
 * reaches client code. Re-runs automatically when the session identity
 * changes, so signing in or out on a mounted page re-resolves correctly.
 */
export function useEnsureWorkspace(): {
  ready: boolean
  status: WorkspaceStatus | null
  rerun: () => void
} {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const lastSessionId = useRef<string | null | undefined>(undefined)

  const mutation = useMutation({
    mutationFn: async (): Promise<WorkspaceStatus> => {
      const res = await fetch('/api/apply/workspace', { method: 'POST' })
      if (!res.ok) throw new Error('Could not initialise your workspace')
      const body = (await res.json().catch(() => null)) as { workspace?: WorkspaceStatus } | null
      // Defensive fallback: the server always returns a status; 'claimable'
      // keeps the helpful banner path visible if that contract ever breaks.
      return body?.workspace ?? 'claimable'
    },
  })

  useEffect(() => {
    if (sessionPending) return
    const sessionId = session?.user?.id ?? null
    if (lastSessionId.current === sessionId) return
    lastSessionId.current = sessionId
    mutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPending, session?.user?.id])

  return {
    ready: mutation.isSuccess && typeof mutation.data === 'string',
    status: mutation.isSuccess ? mutation.data : null,
    rerun: () => mutation.mutate(),
  }
}

/**
 * One-click "Save my work": claims the browser's anonymous workspace for the
 * signed-in account. Server-side conflicts (this account / another account /
 * a concurrent claim) surface as errors carrying their code, so the banner
 * can explain exactly what happened without guessing.
 */
export function useClaimWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await fetch('/api/apply/claim-workspace', { method: 'POST' })
      const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
      if (!res.ok) {
        const error = new Error(body?.error ?? 'Could not save your work') as Error & { code?: string }
        error.code = body?.code
        throw error
      }
    },
    onSuccess: () => {
      // The resolved workspace id has changed to the account's: refetch data.
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY })
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY })
    },
  })
}

const PROFILE_KEY = ['apply-ai', 'profile'] as const
const DOCUMENTS_KEY = ['apply-ai', 'documents'] as const

export function useProfile(enabled: boolean) {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => jsonFetcher<ProfileResponse>('/api/apply/profile'),
    enabled,
  })
}

export function useSaveProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<ProfileSaveResponse> => {
      const res = await fetch('/api/apply/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const error = new Error(
          (body as { error?: string } | null)?.error ?? 'Could not save your profile'
        ) as ProfileSaveError
        error.invalidFields = (body as { invalidFields?: InvalidField[] } | null)?.invalidFields
        throw error
      }
      return body as ProfileSaveResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY })
    },
  })
}

export function useDocuments(enabled: boolean) {
  return useQuery({
    queryKey: DOCUMENTS_KEY,
    queryFn: () => jsonFetcher<{ documents: UploadedDocumentDTO[] }>('/api/apply/documents'),
    enabled,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      documentType: DocumentId
      file: File
      displayLabel?: string
    }): Promise<{ document: UploadedDocumentDTO }> => {
      const form = new FormData()
      form.set('documentType', input.documentType)
      form.set('file', input.file)
      if (input.displayLabel) form.set('displayLabel', input.displayLabel)

      const res = await fetch('/api/apply/documents', { method: 'POST', body: form })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Upload failed')
      }
      return body as { document: UploadedDocumentDTO }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/apply/documents/${encodeURIComponent(documentId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Could not delete the document')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY })
    },
  })
}

export function useRenameDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { documentId: string; displayLabel: string }) => {
      const res = await fetch(`/api/apply/documents/${encodeURIComponent(input.documentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayLabel: input.displayLabel }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Could not rename the document')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY })
    },
  })
}

export { PROFILE_KEY, DOCUMENTS_KEY }

/* ---------------- Apply Agent (V1) ---------------- */

export interface AgentPlanItem {
  index: number
  label: string
  kind: string
  required: boolean
  status: 'mapped' | 'ambiguous' | 'manual' | 'unsafe' | 'unmapped'
  canonical: string | null
  ambiguous: string[]
  needsReview: boolean
  reason: string
  firedByAi: boolean
}

export interface AgentPlanPreview {
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

export interface AgentConnectionState {
  connected: boolean
  pairedAt: string | null
  expiresAt: string | null
  plan: AgentPlanPreview | null
  planAt: string | null
}

const AGENT_STATE_KEY = ['apply-agent', 'state'] as const

/** Live connection state + last detection plan preview. Light polling keeps
 * the page current while the extension scans/fills. */
export function useAgentState(enabled: boolean) {
  return useQuery({
    queryKey: AGENT_STATE_KEY,
    queryFn: () => jsonFetcher<AgentConnectionState>('/api/agent/plan'),
    enabled,
    refetchInterval: 4000,
  })
}

export function useCreatePairingTicket() {
  return useMutation({
    mutationFn: async (): Promise<{ code: string; expiresAt: string }> => {
      const res = await fetch('/api/agent/pairing-ticket', { method: 'POST' })
      const body = (await res.json().catch(() => null)) as { code?: string; expiresAt?: string; error?: string } | null
      if (!res.ok || !body?.code || !body?.expiresAt) {
        throw new Error(body?.error ?? 'Could not create a pairing code')
      }
      return { code: body.code, expiresAt: body.expiresAt }
    },
  })
}

export function useRevokeAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const res = await fetch('/api/agent/revoke', { method: 'POST' })
      const body = (await res.json().catch(() => null)) as { revoked?: number; error?: string } | null
      if (!res.ok) throw new Error(body?.error ?? 'Could not disconnect the agent')
      return body?.revoked ?? 0
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_STATE_KEY })
    },
  })
}