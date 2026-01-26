'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Item } from '@/types/items'

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

interface UseClarteDataOptions {
  searchQuery?: string | null
}

interface UseClarteDataReturn {
  data: ClarteData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useClarteData(options: UseClarteDataOptions = {}): UseClarteDataReturn {
  const { searchQuery } = options
  const [data, setData] = useState<ClarteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Track si on a déjà chargé les données complètes
  const hasFullDataRef = useRef(false)
  const isSearchMode = !!searchQuery

  const fetchData = useCallback(async (forceFullLoad = false) => {
    try {
      // Ne pas afficher le loader si on a déjà des données (évite le flicker)
      if (!data) {
        setIsLoading(true)
      }
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Non authentifié')

      // Si on a déjà les données complètes et pas de forceFullLoad, on skip
      if (hasFullDataRef.current && !forceFullLoad) {
        setIsLoading(false)
        return
      }

      // Charger en mode complet si recherche active ou si on avait déjà les données complètes
      const needsFullLoad = isSearchMode || hasFullDataRef.current || forceFullLoad
      const tasksLimit = needsFullLoad ? 100 : 4
      const notesLimit = needsFullLoad ? 100 : 5
      const ideasLimit = needsFullLoad ? 100 : 4
      const shoppingLimit = needsFullLoad ? 100 : 6

      // Fetch tasks
      const { data: tasks, count: tasksCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'task')
        .in('state', ['active', 'planned', 'captured'])
        .is('parent_id', null)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(tasksLimit)

      // Fetch notes
      const { data: notes, count: notesCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'note')
        .in('state', ['active', 'captured'])
        .order('updated_at', { ascending: false })
        .limit(notesLimit)

      // Fetch ideas
      const { data: ideas, count: ideasCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'idea')
        .in('state', ['active', 'captured', 'project'])
        .order('updated_at', { ascending: false })
        .limit(ideasLimit)

      // Fetch shopping items
      const { data: shoppingItems, count: shoppingCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'list_item')
        .in('state', ['active', 'completed'])
        .order('created_at', { ascending: true })
        .limit(shoppingLimit)

      // Marquer qu'on a les données complètes si on était en mode recherche
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
  }, [data, isSearchMode])

  // Charger les données au montage
  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Recharger en mode complet quand on passe en mode recherche
  useEffect(() => {
    if (isSearchMode && !hasFullDataRef.current) {
      fetchData(true)
    }
  }, [isSearchMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rafraîchir quand la page devient visible (retour depuis capture, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasFullDataRef.current) {
        fetchData(true)
      }
    }

    // Écouter aussi un événement custom pour les changements de données
    const handleDataChange = () => {
      fetchData(true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('clarte-data-changed', handleDataChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('clarte-data-changed', handleDataChange)
    }
  }, [fetchData])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  return { data, isLoading, error, refetch }
}

// Tri intelligent des tâches
function sortTasks(tasks: Item[]): Item[] {
  return tasks.sort((a, b) => {
    // Planifiées dans les 24h en premier
    const aUrgent = a.scheduled_at && isWithin24Hours(a.scheduled_at)
    const bUrgent = b.scheduled_at && isWithin24Hours(b.scheduled_at)
    if (aUrgent && !bUrgent) return -1
    if (!aUrgent && bUrgent) return 1

    // Par date planifiée
    if (a.scheduled_at && b.scheduled_at) {
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    }

    // Planifiées avant non-planifiées
    if (a.scheduled_at && !b.scheduled_at) return -1
    if (!a.scheduled_at && b.scheduled_at) return 1

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

// Tri intelligent des idées
function sortIdeas(ideas: Item[]): Item[] {
  const stateOrder = { project: 1, active: 2, captured: 3 }
  return ideas.sort((a, b) => {
    const orderA = stateOrder[a.state as keyof typeof stateOrder] || 4
    const orderB = stateOrder[b.state as keyof typeof stateOrder] || 4
    if (orderA !== orderB) return orderA - orderB
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

function isWithin24Hours(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000
}
