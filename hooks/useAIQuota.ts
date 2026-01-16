'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { checkAIQuota } from '@/services/quota'

// ============================================
// TYPES
// ============================================

export interface UseAIQuotaReturn {
  // État du quota
  quota: number | null           // Crédits restants (null = illimité ou loading)
  maxQuota: number | null        // Quota max du plan (null = illimité)
  planId: 'essential' | 'plus' | 'family' | null

  // État de chargement
  isLoading: boolean
  error: string | null

  // Flags de statut
  isLow: boolean                 // Quota faible (1-3 crédits)
  isExhausted: boolean           // Quota épuisé (0 crédits)
  isUnlimited: boolean           // Plan illimité

  // Actions
  refresh: () => Promise<void>   // Rafraîchir le quota
}

// Seuil pour considérer le quota comme "faible"
const LOW_QUOTA_THRESHOLD = 3

// ============================================
// HOOK
// ============================================

export function useAIQuota(): UseAIQuotaReturn {
  const { user, isLoading: isAuthLoading } = useAuth()

  const [quota, setQuota] = useState<number | null>(null)
  const [maxQuota, setMaxQuota] = useState<number | null>(null)
  const [planId, setPlanId] = useState<'essential' | 'plus' | 'family' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // FETCH QUOTA
  // ============================================

  const fetchQuota = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Appeler la fonction RPC qui vérifie le quota
      const result = await checkAIQuota(user.id)

      setQuota(result.creditsRemaining)
      setPlanId(result.planId)

      // Utiliser quotaMax retourné par la RPC (valeur réelle de la DB)
      setMaxQuota(result.quotaMax)

    } catch (err) {
      console.error('[useAIQuota] Erreur:', err)
      setError('Impossible de récupérer le quota')

      // Fallback : plan essential avec quota par défaut
      setQuota(10)
      setMaxQuota(10)
      setPlanId('essential')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // ============================================
  // EFFECTS
  // ============================================

  // Charger le quota au montage et quand l'user change
  useEffect(() => {
    if (!isAuthLoading) {
      fetchQuota()
    }
  }, [isAuthLoading, fetchQuota])

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Quota illimité (plan family ou null)
  const isUnlimited = maxQuota === null

  // Quota épuisé (0 crédits)
  const isExhausted = !isUnlimited && quota !== null && quota <= 0

  // Quota faible (1-3 crédits)
  const isLow = !isUnlimited && !isExhausted && quota !== null && quota <= LOW_QUOTA_THRESHOLD

  // ============================================
  // RETURN
  // ============================================

  return {
    quota,
    maxQuota,
    planId,
    isLoading: isLoading || isAuthLoading,
    error,
    isLow,
    isExhausted,
    isUnlimited,
    refresh: fetchQuota
  }
}
