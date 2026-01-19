'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { checkAIQuota } from '@/services/quota'

interface AIQuotaContextType {
  quota: number | null
  maxQuota: number | null
  planId: 'essential' | 'plus' | 'family' | null
  isLoading: boolean
  error: string | null
  isLow: boolean
  isExhausted: boolean
  isUnlimited: boolean
  refresh: () => Promise<void>
}

const AIQuotaContext = createContext<AIQuotaContextType | undefined>(undefined)

const LOW_QUOTA_THRESHOLD = 3

export function AIQuotaProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()

  const [quota, setQuota] = useState<number | null>(null)
  const [maxQuota, setMaxQuota] = useState<number | null>(null)
  const [planId, setPlanId] = useState<'essential' | 'plus' | 'family' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuota = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await checkAIQuota(user.id)
      setQuota(result.creditsRemaining)
      setPlanId(result.planId)
      setMaxQuota(result.quotaMax)
    } catch (err) {
      console.error('[AIQuotaContext] Erreur:', err)
      setError('Impossible de récupérer le quota')
      setQuota(10)
      setMaxQuota(10)
      setPlanId('essential')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!isAuthLoading) {
      fetchQuota()
    }
  }, [isAuthLoading, fetchQuota])

  const isUnlimited = maxQuota === null
  const isExhausted = !isUnlimited && quota !== null && quota <= 0
  const isLow = !isUnlimited && !isExhausted && quota !== null && quota <= LOW_QUOTA_THRESHOLD

  return (
    <AIQuotaContext.Provider
      value={{
        quota,
        maxQuota,
        planId,
        isLoading: isLoading || isAuthLoading,
        error,
        isLow,
        isExhausted,
        isUnlimited,
        refresh: fetchQuota
      }}
    >
      {children}
    </AIQuotaContext.Provider>
  )
}

export function useAIQuota() {
  const context = useContext(AIQuotaContext)
  if (context === undefined) {
    throw new Error('useAIQuota must be used within an AIQuotaProvider')
  }
  return context
}
