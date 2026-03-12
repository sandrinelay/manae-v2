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

  // Ajouter les tâches Manae planifiées
  for (const item of manaeItems) {
    if (!item.scheduled_at) continue
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
      setDays(mergeToDays(gcalEvents, manaeItems || []))
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
