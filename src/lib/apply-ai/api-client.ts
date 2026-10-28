'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/**
 * Creates/reads the anonymous workspace (httpOnly cookie). Must complete before
 * profile or document queries run. The token value never reaches client code.
 */
export function useEnsureWorkspace(): boolean {
  const started = useRef(false)
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/apply/workspace', { method: 'POST' })
      if (!res.ok) throw new Error('Could not initialise your workspace')
      return res.json()
    },
  })

  useEffect(() => {
    if (!started.current) {
      started.current = true
      mutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return mutation.isSuccess
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