'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { createClient } from '@/lib/supabase/client'
import type { Item } from '@/types/items'

// ============================================
// TYPES
// ============================================

interface ClarteData {
  tasks: Item[]
  notes: Item[]
  ideas: Item[]
  shoppingItems: Item[]
  counts: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
}

interface ClarteDataContextType {
  data: ClarteData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  loadFullData: () => Promise<void>
}

// ============================================
// CONTEXT
// ============================================

const ClarteDataContext = createContext<ClarteDataContextType | undefined>(undefined)

// ============================================
// HELPERS
// ============================================

function isWithin24Hours(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000
}

function sortTasks(tasks: Item[]): Item[] {
  return tasks.sort((a, b) => {
    const aUrgent = a.scheduled_at && isWithin24Hours(a.scheduled_at)
    const bUrgent = b.scheduled_at && isWithin24Hours(b.scheduled_at)
    if (aUrgent && !bUrgent) return -1
    if (!aUrgent && bUrgent) return 1

    if (a.scheduled_at && b.scheduled_at) {
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    }

    if (a.scheduled_at && !b.scheduled_at) return -1
    if (!a.scheduled_at && b.scheduled_at) return 1

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function sortIdeas(ideas: Item[]): Item[] {
  const stateOrder = { project: 1, active: 2, captured: 3 }
  return ideas.sort((a, b) => {
    const orderA = stateOrder[a.state as keyof typeof stateOrder] || 4
    const orderB = stateOrder[b.state as keyof typeof stateOrder] || 4
    if (orderA !== orderB) return orderA - orderB
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

// ============================================
// PROVIDER
// ============================================

export function ClarteDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<ClarteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const hasFullDataRef = useRef(false)

  const fetchData = useCallback(async (forceFullLoad = false) => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      if (!data) {
        setIsLoading(true)
      }
      setError(null)

      const supabase = createClient()

      if (hasFullDataRef.current && !forceFullLoad) {
        setIsLoading(false)
        return
      }

      const needsFullLoad = hasFullDataRef.current || forceFullLoad
      const tasksLimit = needsFullLoad ? 100 : 4
      const notesLimit = needsFullLoad ? 100 : 5
      const ideasLimit = needsFullLoad ? 100 : 4
      const shoppingLimit = needsFullLoad ? 100 : 6

      const { data: tasks, count: tasksCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'task')
        .in('state', ['active', 'planned', 'captured'])
        .is('parent_id', null)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(tasksLimit)

      const { data: notes, count: notesCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'note')
        .in('state', ['active', 'captured'])
        .order('updated_at', { ascending: false })
        .limit(notesLimit)

      const { data: ideas, count: ideasCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'idea')
        .in('state', ['active', 'captured', 'project'])
        .order('updated_at', { ascending: false })
        .limit(ideasLimit)

      const { data: shoppingItems, count: shoppingCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'list_item')
        .in('state', ['active', 'completed'])
        .order('created_at', { ascending: true })
        .limit(shoppingLimit)

      if (needsFullLoad) {
        hasFullDataRef.current = true
      }

      setData({
        tasks: sortTasks(tasks || []),
        notes: notes || [],
        ideas: sortIdeas(ideas || []),
        shoppingItems: shoppingItems || [],
        counts: {
          tasks: tasksCount || 0,
          notes: notesCount || 0,
          ideas: ideasCount || 0,
          shopping: shoppingCount || 0
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur inconnue'))
    } finally {
      setIsLoading(false)
    }
  }, [user, data])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => fetchData(true), [fetchData])
  const loadFullData = useCallback(() => fetchData(true), [fetchData])

  return (
    <ClarteDataContext.Provider value={{ data, isLoading, error, refetch, loadFullData }}>
      {children}
    </ClarteDataContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useClarteData() {
  const context = useContext(ClarteDataContext)
  if (context === undefined) {
    throw new Error('useClarteData must be used within a ClarteDataProvider')
  }
  return context
}
