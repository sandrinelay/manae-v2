// features/schedule/hooks/useScheduling.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getOrCreateUserProfile, getConstraints } from '@/services/supabaseService'
import { getCalendarEvents, createCalendarEvent } from '@/features/schedule/services/calendar.service'
import { findAvailableSlots } from '@/features/schedule/services/slots.service'
import { estimateTaskDuration } from '@/features/schedule/services/ai-duration.service'
import { updateItem } from '@/services/supabase/items.service'
import type { TimeSlot, GoogleCalendarEvent } from '../types/scheduling.types'
import type { Mood, TemporalConstraint } from '@/types/items'

// ============================================
// TYPES
// ============================================

export type DurationOption = 15 | 30 | 60

export interface UseSchedulingParams {
  itemId: string
  taskContent: string
  mood?: Mood
  temporalConstraint?: TemporalConstraint | null
}

export interface UseSchedulingReturn {
  // État
  isLoading: boolean
  error: string | null
  slots: TimeSlot[]
  estimatedDuration: DurationOption
  selectedSlot: TimeSlot | null
  isCalendarConnected: boolean

  // Actions
  setDuration: (duration: DurationOption) => void
  selectSlot: (slot: TimeSlot | null) => void
  loadSlots: () => Promise<void>
  scheduleTask: () => Promise<boolean>
}

// ============================================
// HOOK
// ============================================

export function useScheduling(params: UseSchedulingParams): UseSchedulingReturn {
  const { itemId, taskContent, mood, temporalConstraint } = params

  // ============================================
  // ÉTAT
  // ============================================

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [estimatedDuration, setEstimatedDuration] = useState<DurationOption>(30)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isCalendarConnected, setIsCalendarConnected] = useState(true)

  // ============================================
  // ESTIMATION INITIALE
  // ============================================

  useEffect(() => {
    // Estimer la durée dès le chargement du hook
    const duration = estimateTaskDuration(taskContent)
    setEstimatedDuration(duration)
  }, [taskContent])

  // Track si les slots ont déjà été chargés une fois
  const [slotsLoaded, setSlotsLoaded] = useState(false)

  // ============================================
  // ACTIONS
  // ============================================

  const setDuration = useCallback((duration: DurationOption) => {
    setEstimatedDuration(duration)
    setSelectedSlot(null) // Reset la sélection quand la durée change
  }, [])

  // Recharger les slots automatiquement quand la durée change (après le premier chargement)
  useEffect(() => {
    if (slotsLoaded) {
      // Utiliser un timeout pour laisser le state se mettre à jour
      const timer = setTimeout(() => {
        loadSlotsInternal()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [estimatedDuration])

  const selectSlot = useCallback((slot: TimeSlot | null) => {
    setSelectedSlot(slot)
    setError(null)
  }, [])

  /**
   * Charge les créneaux disponibles (fonction interne)
   */
  const loadSlotsInternal = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSlots([])
    setSelectedSlot(null)

    try {
      // Vérifier si Google Calendar est connecté
      const tokens = localStorage.getItem('google_tokens')
      if (!tokens) {
        setIsCalendarConnected(false)
        setError('calendar_not_connected')
        return
      }
      setIsCalendarConnected(true)

      // 1. Récupérer le profil user (energy_moments)
      const profile = await getOrCreateUserProfile()
      const energyMoments = profile.energy_moments || []

      // 2. Récupérer les contraintes horaires
      const constraints = await getConstraints()

      // 3. Récupérer les événements Google Calendar (7 jours)
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7)

      let calendarEvents: GoogleCalendarEvent[] = []
      try {
        calendarEvents = await getCalendarEvents(startDate, endDate)
      } catch (calendarError) {
        console.warn('[useScheduling] Erreur Calendar:', calendarError)

        // Vérifier si c'est une erreur d'auth
        if (calendarError instanceof Error) {
          if (calendarError.message.includes('Session Google expirée')) {
            setIsCalendarConnected(false)
            setError('calendar_session_expired')
            return
          }
        }
        // Continuer sans les événements calendar
        calendarEvents = []
      }

      // 4. Trouver les créneaux libres avec scoring intégré
      // Passe temporalConstraint pour le filtrage HARD et l'ajustement du scoring
      // Passe taskContent pour détecter les contraintes de service (médecin, banque, etc.)
      const allSlots = await findAvailableSlots({
        durationMinutes: estimatedDuration,
        constraints,
        calendarEvents,
        startDate,
        endDate,
        energyMoments,
        mood: mood || 'neutral',
        temporalConstraint,
        taskContent
      })

      // 5. Garder uniquement le TOP 3
      const top3 = allSlots.slice(0, 3)
      setSlots(top3)

      console.log('[useScheduling] Top 3 créneaux:', top3)

      if (top3.length === 0) {
        setError('Aucun créneau disponible sur les 7 prochains jours')
      }

    } catch (err) {
      console.error('[useScheduling] Erreur loadSlots:', err)

      // Gestion erreurs spécifiques
      if (err instanceof Error) {
        if (err.message.includes('Google Calendar non connecté')) {
          setError('calendar_not_connected')
        } else if (err.message.includes('Session Google expirée')) {
          setError('calendar_session_expired')
        } else {
          setError(err.message)
        }
      } else {
        setError('Erreur lors de la recherche de créneaux')
      }

      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }, [estimatedDuration, mood, temporalConstraint, taskContent])

  /**
   * Charge les créneaux (fonction exposée)
   */
  const loadSlots = useCallback(async () => {
    setSlotsLoaded(true)
    await loadSlotsInternal()
  }, [loadSlotsInternal])

  /**
   * Planifie la tâche dans le créneau sélectionné
   */
  const scheduleTask = useCallback(async (): Promise<boolean> => {
    if (!selectedSlot) {
      setError('Aucun créneau sélectionné')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Créer l'événement dans Google Calendar
      const startDateTime = `${selectedSlot.date}T${selectedSlot.startTime}:00`
      const endDateTime = `${selectedSlot.date}T${selectedSlot.endTime}:00`

      console.log('[useScheduling] Création événement Calendar:', {
        summary: taskContent,
        startDateTime,
        endDateTime
      })

      const eventId = await createCalendarEvent({
        summary: taskContent,
        startDateTime,
        endDateTime
      })

      console.log('[useScheduling] Événement créé:', eventId)

      // 2. Update l'item en DB
      await updateItem(itemId, {
        state: 'planned',
        scheduled_at: startDateTime,
        google_event_id: eventId
      })

      console.log('[useScheduling] Item mis à jour en DB')

      return true

    } catch (err) {
      console.error('[useScheduling] Erreur scheduleTask:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erreur lors de la planification')
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }, [selectedSlot, taskContent, itemId])

  // ============================================
  // RETURN
  // ============================================

  return {
    isLoading,
    error,
    slots,
    estimatedDuration,
    selectedSlot,
    isCalendarConnected,
    setDuration,
    selectSlot,
    loadSlots,
    scheduleTask
  }
}
