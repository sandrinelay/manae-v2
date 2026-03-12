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
    const gcalEventIds = new Set(gcalEvents.map(e => e.id))

    // 4. Identifier les tâches orphelines (google_event_id absent de GCal)
    const futurePlanned = plannedItems.filter(i => new Date(i.scheduled_at!) >= today)
    const orphaned = futurePlanned.filter(i => !gcalEventIds.has(i.google_event_id!))

    if (orphaned.length === 0) return

    // 5. Repasser les orphelines en active
    await Promise.all(
      orphaned.map(item =>
        supabase
          .from('items')
          .update({
            state: 'active',
            scheduled_at: null,
            google_event_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      )
    )

    console.log(`[gcal-sync] ${orphaned.length} tâche(s) orpheline(s) repassées en active`)
    window.dispatchEvent(new CustomEvent('clarte-data-changed'))
  } catch (err) {
    // Silencieux : la sync est best-effort
    console.warn('[gcal-sync] reconciliation failed:', err)
  }
}
