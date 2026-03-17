'use client'

/**
 * Réconciliation GCal ↔ Manae au chargement de l'app.
 *
 * Vérifie TOUTES les tâches `planned` avec un `google_event_id`
 * (pas seulement la fenêtre des 7 jours de l'agenda).
 *
 * Si l'événement GCal correspondant n'existe plus, la tâche repasse en `active`.
 * Silencieux : ne bloque pas l'UI, ne throw jamais.
 */

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCalendarEvents } from '@/features/schedule/services/calendar.service'

function hasGoogleTokens(): boolean {
  try {
    return !!localStorage.getItem('google_tokens')
  } catch {
    return false
  }
}

export function useGcalSync() {
  useEffect(() => {
    // Ne pas lancer si GCal n'est pas connecté
    if (!hasGoogleTokens()) return

    reconcilePlannedTasks()

    // Relancer à chaque retour sur l'app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && hasGoogleTokens()) {
        reconcilePlannedTasks()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])
}

async function reconcilePlannedTasks(): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Récupérer toutes les tâches planned avec un google_event_id
    const { data: plannedItems } = await supabase
      .from('items')
      .select('id, google_event_id, scheduled_at')
      .eq('user_id', user.id)
      .eq('type', 'task')
      .eq('state', 'planned')
      .not('google_event_id', 'is', null)
      .not('scheduled_at', 'is', null)

    if (!plannedItems || plannedItems.length === 0) return

    // 2. Calculer la fenêtre couvrant toutes les tâches planned
    const dates = plannedItems.map(i => new Date(i.scheduled_at!).getTime())
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const rangeStart = today // On ne vérifie pas le passé — tâches passées = déjà gérées
    const rangeEnd = new Date(Math.max(...dates, today.getTime()))
    rangeEnd.setDate(rangeEnd.getDate() + 1) // +1 jour pour inclure la dernière date

    // 3. Fetch tous les événements GCal sur cette fenêtre
    const gcalEvents = await getCalendarEvents(rangeStart, rangeEnd)
    const gcalEventMap = new Map(gcalEvents.map(e => [e.id, e]))

    // 4. Tâches futures uniquement
    const futurePlanned = plannedItems.filter(i => new Date(i.scheduled_at!) >= today)

    // 5. Orphelines (événement GCal supprimé) → repasser en active
    const orphaned = futurePlanned.filter(i => !gcalEventMap.has(i.google_event_id!))

    // 6. Horaires modifiés dans GCal → mettre à jour scheduled_at
    const timeChanged = futurePlanned
      .filter(i => gcalEventMap.has(i.google_event_id!))
      .filter(i => {
        const gcalStart = gcalEventMap.get(i.google_event_id!)!.start.dateTime
        if (!gcalStart || !i.scheduled_at) return false
        return new Date(gcalStart).getTime() !== new Date(i.scheduled_at).getTime()
      })

    if (orphaned.length === 0 && timeChanged.length === 0) return

    if (orphaned.length > 0) {
      await Promise.all(orphaned.map(item =>
        supabase.from('items')
          .update({ state: 'active', scheduled_at: null, google_event_id: null, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      ))
      console.log(`[gcal-sync] ${orphaned.length} tâche(s) orpheline(s) repassées en active`)
    }

    if (timeChanged.length > 0) {
      await Promise.all(timeChanged.map(item => {
        const gcalStart = gcalEventMap.get(item.google_event_id!)!.start.dateTime!
        return supabase.from('items')
          .update({ scheduled_at: new Date(gcalStart).toISOString(), updated_at: new Date().toISOString() })
          .eq('id', item.id)
      }))
      console.log(`[gcal-sync] ${timeChanged.length} horaire(s) resynchronisé(s) depuis GCal`)
    }

    window.dispatchEvent(new CustomEvent('clarte-data-changed'))
  } catch (err) {
    // Silencieux : la sync est best-effort
    console.warn('[gcal-sync] reconciliation failed:', err)
  }
}
