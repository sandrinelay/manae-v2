'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface UseClarteDataReturn {
  data: ClarteData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useClarteData(): UseClarteDataReturn {
  const [data, setData] = useState<ClarteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Non authentifié')

      // Fetch tasks (4 items pour aperçu)
      const { data: tasks, count: tasksCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'task')
        .in('state', ['active', 'planned', 'captured'])
        .is('parent_id', null)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(4)

      // Fetch notes (5 items pour aperçu)
      const { data: notes, count: notesCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'note')
        .in('state', ['active', 'captured'])
        .order('updated_at', { ascending: false })
        .limit(5)

      // Fetch ideas (4 items pour aperçu)
      const { data: ideas, count: ideasCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'idea')
        .in('state', ['active', 'captured', 'project'])
        .order('updated_at', { ascending: false })
        .limit(4)

      // Fetch shopping items (liste active)
      const { data: shoppingItems, count: shoppingCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'list_item')
        .eq('state', 'active')
        .order('created_at', { ascending: true })
        .limit(6)

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
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
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
