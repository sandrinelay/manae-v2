'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCalendarEvents } from '@/features/schedule/services/calendar.service'
import type { GoogleCalendarEvent } from '@/features/schedule/types/scheduling.types'
import type { Item } from '@/types/items'

// ============================================
// TYPES
// ============================================

export interface AgendaEvent {
  id: string
  title: string
  startTime: string   // Format "HH:MM"
  endTime: string     // Format "HH:MM"
  source: 'gcal' | 'manae'
  contextColor?: string  // Pour les tâches Manae
}

export interface AgendaDay {
  date: Date
  label: string       // "Aujourd'hui", "Demain", "Lundi 16 mars"
  events: AgendaEvent[]
}

interface UseAgendaReturn {
  isOpen: boolean
  days: AgendaDay[]
  isLoadingGcal: boolean
  gcalError: string | null
  isGcalConnected: boolean
  open: () => void
  close: () => void
}

// ============================================
// HELPERS
// ============================================

function getDayLabel(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (isSameDay(date, today)) return "Aujourd'hui"
  if (isSameDay(date, tomorrow)) return 'Demain'

  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toTimeString(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function gcalEventToAgenda(event: GoogleCalendarEvent): AgendaEvent {
  const start = event.start.dateTime || event.start.date || ''
  const end = event.end?.dateTime || event.end?.date || ''
  return {
    id: event.id,
    title: event.summary || '(Sans titre)',
    startTime: start ? toTimeString(start) : '00:00',
    endTime: end ? toTimeString(end) : '',
    source: 'gcal',
  }
}

function manaeItemToAgenda(item: Item): AgendaEvent {
  return {
    id: item.id,
    title: item.content,
    startTime: item.scheduled_at ? toTimeString(item.scheduled_at) : '00:00',
    endTime: '',
    source: 'manae',
    contextColor: item.context || 'personal',
  }
}

function buildEmptyDays(): AgendaDay[] {
  const days: AgendaDay[] = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    days.push({ date, label: getDayLabel(date), events: [] })
  }
  return days
}

function mergeToDays(
  gcalEvents: GoogleCalendarEvent[],
  manaeItems: Item[]
): AgendaDay[] {
  const days = buildEmptyDays()

  // Ajouter les événements GCal
  for (const event of gcalEvents) {
    const startStr = event.start.dateTime || event.start.date
    if (!startStr) continue
    const eventDate = new Date(startStr)
    const day = days.find(d => isSameDay(d.date, eventDate))
    if (day) {
      day.events.push(gcalEventToAgenda(event))
    }
  }

  // Ajouter les tâches Manae planifiées (sauf celles déjà présentes dans GCal)
  const gcalEventIds = new Set(gcalEvents.map(e => e.id))
  for (const item of manaeItems) {
    if (!item.scheduled_at) continue
    // Si la tâche a un événement GCal correspondant, on l'affiche via GCal (évite le doublon)
    if (item.google_event_id && gcalEventIds.has(item.google_event_id)) continue
    const itemDate = new Date(item.scheduled_at)
    const day = days.find(d => isSameDay(d.date, itemDate))
    if (day) {
      day.events.push(manaeItemToAgenda(item))
    }
  }

  // Trier chaque jour par heure
  for (const day of days) {
    day.events.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return days
}

// ============================================
// HOOK
// ============================================

export function useAgenda(): UseAgendaReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [days, setDays] = useState<AgendaDay[]>(buildEmptyDays())
  const [isLoadingGcal, setIsLoadingGcal] = useState(false)
  const [gcalError, setGcalError] = useState<string | null>(null)
  const [isGcalConnected, setIsGcalConnected] = useState(true)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fenêtre : aujourd'hui → J+6
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 7)

    // 1. Tâches Manae planifiées (immédiat)
    const { data: manaeItems } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'task')
      .eq('state', 'planned')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', endDate.toISOString())

    setDays(mergeToDays([], manaeItems || []))

    // 2. Événements GCal (async)
    setIsLoadingGcal(true)
    setGcalError(null)
    try {
      const gcalEvents = await getCalendarEvents(today, endDate)
      setIsGcalConnected(true)

      // Réconciliation bidirectionnelle GCal ↔ Manae
      const gcalEventMap = new Map(gcalEvents.map(e => [e.id, e]))
      const linkedItems = (manaeItems || []).filter(item => item.google_event_id)

      // 1. Tâches orphelines (événement GCal supprimé) → repasser en active
      const orphanedItems = linkedItems.filter(item => !gcalEventMap.has(item.google_event_id!))

      // 2. Tâches dont l'horaire a changé dans GCal → mettre à jour scheduled_at
      const timeChangedItems = linkedItems
        .filter(item => gcalEventMap.has(item.google_event_id!))
        .filter(item => {
          const gcalStart = gcalEventMap.get(item.google_event_id!)!.start.dateTime
          if (!gcalStart || !item.scheduled_at) return false
          return new Date(gcalStart).getTime() !== new Date(item.scheduled_at).getTime()
        })

      const needsSync = orphanedItems.length > 0 || timeChangedItems.length > 0

      if (orphanedItems.length > 0) {
        await Promise.all(orphanedItems.map(item =>
          supabase.from('items')
            .update({ state: 'active', scheduled_at: null, google_event_id: null, updated_at: new Date().toISOString() })
            .eq('id', item.id)
        ))
      }

      if (timeChangedItems.length > 0) {
        await Promise.all(timeChangedItems.map(item => {
          const gcalStart = gcalEventMap.get(item.google_event_id!)!.start.dateTime!
          return supabase.from('items')
            .update({ scheduled_at: new Date(gcalStart).toISOString(), updated_at: new Date().toISOString() })
            .eq('id', item.id)
        }))
      }

      if (needsSync) {
        window.dispatchEvent(new CustomEvent('clarte-data-changed'))
      }

      // Reconstruire la liste locale avec les orphelins exclus
      const activeItems = (manaeItems || []).filter(
        item => !orphanedItems.find(o => o.id === item.id)
      )
      setDays(mergeToDays(gcalEvents, activeItems))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      if (message.includes('token') || message.includes('auth') || message.includes('401')) {
        setIsGcalConnected(false)
      } else {
        setGcalError('Impossible de charger Google Calendar')
      }
    } finally {
      setIsLoadingGcal(false)
    }
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    loadData()
  }, [loadData])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return { isOpen, days, isLoadingGcal, gcalError, isGcalConnected, open, close }
}
