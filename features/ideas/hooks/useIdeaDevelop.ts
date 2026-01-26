'use client'

import { useState, useCallback } from 'react'
import type {
  IdeaAge,
  IdeaBlocker,
  DevelopStep,
  DevelopIdeaResponse
} from '../types'

// ============================================
// TYPES
// ============================================

interface UseIdeaDevelopOptions {
  itemId: string
  onSuccess?: (response: DevelopIdeaResponse) => void
  onError?: (error: Error) => void
}

interface UseIdeaDevelopReturn {
  // État
  currentStep: DevelopStep
  ideaAge: IdeaAge | null
  blockers: IdeaBlocker[]
  isLoading: boolean
  error: Error | null
  result: DevelopIdeaResponse | null

  // Actions
  selectAge: (age: IdeaAge) => void
  confirmAge: () => void
  toggleBlocker: (blocker: IdeaBlocker) => void
  develop: () => Promise<void>
  reset: () => void
  goBack: () => void
}

// ============================================
// HOOK
// ============================================

export function useIdeaDevelop(options: UseIdeaDevelopOptions): UseIdeaDevelopReturn {
  const { itemId, onSuccess, onError } = options

  // État local
  const [currentStep, setCurrentStep] = useState<DevelopStep>('age')
  const [ideaAge, setIdeaAgeState] = useState<IdeaAge | null>(null)
  const [blockers, setBlockers] = useState<IdeaBlocker[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<DevelopIdeaResponse | null>(null)

  /**
   * Sélectionner l'âge de l'idée (sans passer à l'étape suivante)
   */
  const selectAge = useCallback((age: IdeaAge) => {
    setIdeaAgeState(age)
  }, [])

  /**
   * Confirmer l'âge et passer à l'étape suivante
   */
  const confirmAge = useCallback(() => {
    if (ideaAge) {
      setCurrentStep('blockers')
    }
  }, [ideaAge])

  /**
   * Toggle un blocage (sélection multiple)
   */
  const toggleBlocker = useCallback((blocker: IdeaBlocker) => {
    setBlockers(prev =>
      prev.includes(blocker)
        ? prev.filter(b => b !== blocker)
        : [...prev, blocker]
    )
  }, [])

  /**
   * Retour à l'étape précédente
   */
  const goBack = useCallback(() => {
    if (currentStep === 'blockers') {
      setCurrentStep('age')
      setIdeaAgeState(null)
      setBlockers([])
    }
  }, [currentStep])

  /**
   * Lancer le développement via API
   */
  const develop = useCallback(async () => {
    if (!ideaAge) return

    // Éviter les doubles appels si déjà en cours ou déjà terminé
    if (isLoading || result) {
      return
    }

    setIsLoading(true)
    setCurrentStep('loading')
    setError(null)

    try {
      const response = await fetch('/api/develop-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          idea_age: ideaAge,
          blockers: ideaAge === 'old' ? blockers : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du développement')
      }

      const data: DevelopIdeaResponse = await response.json()
      setResult(data)
      setCurrentStep('result')
      onSuccess?.(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue')
      setError(error)
      setCurrentStep('blockers')
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [itemId, ideaAge, blockers, isLoading, result, onSuccess, onError])

  /**
   * Réinitialiser le flow
   */
  const reset = useCallback(() => {
    setCurrentStep('age')
    setIdeaAgeState(null)
    setBlockers([])
    setError(null)
    setResult(null)
  }, [])

  return {
    currentStep,
    ideaAge,
    blockers,
    isLoading,
    error,
    result,
    selectAge,
    confirmAge,
    toggleBlocker,
    develop,
    reset,
    goBack
  }
}
