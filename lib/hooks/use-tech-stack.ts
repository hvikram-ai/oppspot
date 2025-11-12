'use client'

/**
 * Tech Stack API Hooks
 * SWR-based hooks for fetching and mutating tech stack data
 */

import useSWR from 'swr'
import { useState } from 'react'
import type {
  TechStackAnalysisListItem,
  TechStackAnalysisWithDetails,
  TechStackTechnologyWithSource,
  TechStackFindingWithTechnologies,
} from '@/lib/data-room/types'

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'An error occurred')
  }
  const data = await res.json()
  return data
}

/**
 * Hook to fetch list of analyses for a data room
 */
export function useTechStackAnalyses(dataRoomId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    dataRoomId ? `/api/tech-stack/analyses?data_room_id=${dataRoomId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return {
    analyses: (data?.data as TechStackAnalysisListItem[]) || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Hook to fetch a single analysis with details
 */
export function useTechStackAnalysis(analysisId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    analysisId ? `/api/tech-stack/analyses/${analysisId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return {
    analysis: data?.data as TechStackAnalysisWithDetails | undefined,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Hook to fetch technologies for an analysis
 */
export function useTechStackTechnologies(
  analysisId: string | null,
  filters?: {
    category?: string
    authenticity?: string
    search?: string
  }
) {
  const params = new URLSearchParams()
  if (filters?.category) params.append('category', filters.category)
  if (filters?.authenticity) params.append('authenticity', filters.authenticity)
  if (filters?.search) params.append('search', filters.search)

  const queryString = params.toString()
  const url = analysisId
    ? `/api/tech-stack/analyses/${analysisId}/technologies${queryString ? `?${queryString}` : ''}`
    : null

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  })

  return {
    technologies: (data?.data as TechStackTechnologyWithSource[]) || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Hook to fetch findings for an analysis
 */
export function useTechStackFindings(
  analysisId: string | null,
  filters?: {
    finding_type?: string
    severity?: string
  }
) {
  const params = new URLSearchParams()
  if (filters?.finding_type) params.append('finding_type', filters.finding_type)
  if (filters?.severity) params.append('severity', filters.severity)

  const queryString = params.toString()
  const url = analysisId
    ? `/api/tech-stack/analyses/${analysisId}/findings${queryString ? `?${queryString}` : ''}`
    : null

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  })

  return {
    findings: (data?.data as TechStackFindingWithTechnologies[]) || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Hook to create a new analysis
 */
export function useCreateTechStackAnalysis() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAnalysis = async (data: {
    data_room_id: string
    title: string
    description?: string
    tags?: string[]
  }) => {
    setIsCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/tech-stack/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create analysis')
      }

      const result = await res.json()
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  return { createAnalysis, isCreating, error }
}

/**
 * Hook to trigger AI analysis
 */
export function useTriggerTechStackAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const triggerAnalysis = async (
    analysisId: string,
    options?: {
      document_ids?: string[]
      force_reanalysis?: boolean
    }
  ) => {
    setIsAnalyzing(true)
    setError(null)
    setProgress('Starting analysis...')

    try {
      const res = await fetch(`/api/tech-stack/analyses/${analysisId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to trigger analysis')
      }

      setProgress('Analysis complete!')
      const result = await res.json()
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setProgress(null)
      throw err
    } finally {
      setIsAnalyzing(false)
    }
  }

  return { triggerAnalysis, isAnalyzing, error, progress }
}

/**
 * Hook to delete an analysis
 */
export function useDeleteTechStackAnalysis() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteAnalysis = async (analysisId: string) => {
    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/tech-stack/analyses/${analysisId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete analysis')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }

  return { deleteAnalysis, isDeleting, error }
}
