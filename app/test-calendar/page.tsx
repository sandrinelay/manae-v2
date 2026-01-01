// app/test-calendar/page.tsx
'use client'

import { useState } from 'react'
import { getCalendarEvents, createCalendarEvent } from '@/features/schedule/services/calendar.service'
import { Button } from '@/components/ui/Button'

export default function TestCalendarPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
    console.log(message)
  }

  const clearLogs = () => {
    setLogs([])
  }

  const testGetEvents = async () => {
    setIsLoading(true)
    clearLogs()
    addLog('🔍 Test 1: Récupération des événements...')

    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7)

      addLog(`Période: ${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()}`)

      const events = await getCalendarEvents(startDate, endDate)
      
      addLog(`✅ ${events.length} événements récupérés`)
      
      if (events.length === 0) {
        addLog('ℹ️ Aucun événement dans les 7 prochains jours')
      } else {
        events.slice(0, 5).forEach((event, index) => {
          const startTime = event.start.dateTime || event.start.date
          addLog(`  ${index + 1}. ${event.summary} - ${startTime}`)
        })
        
        if (events.length > 5) {
          addLog(`  ... et ${events.length - 5} autres événements`)
        }
      }

    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      console.error('Erreur complète:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testCreateEvent = async () => {
    setIsLoading(true)
    clearLogs()
    addLog('📅 Test 2: Création d\'un événement...')

    try {
      // Créer un événement demain à 14h
      const testStart = new Date()
      testStart.setDate(testStart.getDate() + 1)
      testStart.setHours(14, 0, 0, 0)

      const testEnd = new Date(testStart)
      testEnd.setHours(15, 0, 0, 0)

      addLog(`Événement: Demain ${testStart.toLocaleString()} → ${testEnd.toLocaleTimeString()}`)

      const eventId = await createCalendarEvent({
        summary: '[TEST MANAE] Événement de test',
        description: 'Ceci est un événement de test créé par Manae pour valider l\'API Google Calendar',
        startDateTime: testStart.toISOString().slice(0, 19),
        endDateTime: testEnd.toISOString().slice(0, 19)
      })

      addLog(`✅ Événement créé avec succès!`)
      addLog(`ID: ${eventId}`)
      addLog(`👉 Vérifie ton Google Calendar pour voir l'événement`)

    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      console.error('Erreur complète:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testFindSlots = async () => {
    setIsLoading(true)
    clearLogs()
    addLog('🎯 Test COMPLET : Recherche créneaux avec TOUS les facteurs')

    try {
      const { findAvailableSlots } = await import('@/features/schedule/services/slots.service')
      const { getCalendarEvents } = await import('@/features/schedule/services/calendar.service')
      const { getConstraints, getOrCreateUserProfile } = await import('@/services/supabaseService')

      // ============================================
      // 1. RÉCUPÉRER TOUS LES PARAMÈTRES
      // ============================================
      
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7)

      addLog('📅 ÉTAPE 1/5 : Récupération événements Google Calendar')
      const events = await getCalendarEvents(startDate, endDate)
      addLog(`   ✅ ${events.length} événement(s) récupéré(s)`)
      if (events.length > 0) {
        events.slice(0, 3).forEach(e => {
          const start = e.start.dateTime || e.start.date
          addLog(`      - ${e.summary} (${start})`)
        })
        if (events.length > 3) addLog(`      ... et ${events.length - 3} autres`)
      }

      addLog('\n⏰ ÉTAPE 2/5 : Récupération contraintes horaires')
      const constraints = await getConstraints()
      addLog(`   ✅ ${constraints.length} contrainte(s)`)
      if (constraints.length > 0) {
        constraints.forEach(c => {
          addLog(`      - ${c.name}: ${c.start_time}-${c.end_time} (${c.days.join(', ')})`)
        })
      } else {
        addLog(`      ℹ️ Aucune contrainte → Tous les créneaux disponibles`)
      }

      addLog('\n💪 ÉTAPE 3/5 : Récupération moments d\'énergie')
      const profile = await getOrCreateUserProfile()
      const energyMoments = profile.energy_moments || []
      addLog(`   ✅ Moments d'énergie: ${energyMoments.length > 0 ? energyMoments.join(', ') : 'TOUS (par défaut)'}`)

      addLog('\n😊 ÉTAPE 4/5 : Configuration mood')
      const mood = 'energetic'
      addLog(`   ✅ Mood testé: ${mood}`)

      // ============================================
      // 2. LANCER L'ALGORITHME
      // ============================================
      
      addLog('\n🔍 ÉTAPE 5/5 : Recherche créneaux optimaux...')
      addLog(`   Durée tâche: 60 minutes`)
      addLog(`   Période: ${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()}`)
      
      const result = await findAvailableSlots({
        durationMinutes: 60,
        constraints,
        calendarEvents: events,
        startDate,
        endDate,
        energyMoments,
        mood
      })
      const slots = result.slots

      addLog(`\n✅ ${slots.length} créneau(x) trouvé(s) et scoré(s)\n`)

      // ============================================
      // 3. AFFICHER LES RÉSULTATS
      // ============================================
      
      if (slots.length === 0) {
        addLog('⚠️ AUCUN CRÉNEAU DISPONIBLE')
        addLog('Raisons possibles :')
        addLog('  - Trop de contraintes horaires')
        addLog('  - Agenda Calendar très chargé')
        addLog('  - Moments d\'énergie trop restrictifs')
        return
      }

      // Top 10
      addLog('🏆 TOP 10 CRÉNEAUX :')
      addLog('─────────────────────────────────────')
      
      slots.slice(0, 10).forEach((slot, index) => {
        const date = new Date(slot.date)
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' })
        const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        
        addLog(`\n${index + 1}. [Score: ${slot.score}] ${dayName} ${dateStr}`)
        addLog(`   ⏰ ${slot.startTime} → ${slot.endTime}`)
        addLog(`   💡 ${slot.reason}`)
      })

      // Statistiques
      addLog('\n📊 STATISTIQUES :')
      addLog(`   Score moyen: ${Math.round(slots.reduce((sum, s) => sum + s.score, 0) / slots.length)}`)
      addLog(`   Score max: ${Math.max(...slots.map(s => s.score))}`)
      addLog(`   Score min: ${Math.min(...slots.map(s => s.score))}`)
      
      // Distribution par jour
      const slotsByDay: Record<string, number> = {}
      slots.forEach(slot => {
        const day = new Date(slot.date).toLocaleDateString('fr-FR', { weekday: 'long' })
        slotsByDay[day] = (slotsByDay[day] || 0) + 1
      })
      
      addLog('\n📅 RÉPARTITION PAR JOUR :')
      Object.entries(slotsByDay).forEach(([day, count]) => {
        addLog(`   ${day}: ${count} créneau(x)`)
      })

    } catch (error) {
      addLog(`\n❌ ERREUR: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      console.error('Erreur complète:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const checkTokens = () => {
    clearLogs()
    addLog('🔑 Vérification des tokens Google...')

    const tokens = localStorage.getItem('google_tokens')
    
    if (!tokens) {
      addLog('❌ Aucun token trouvé')
      addLog('👉 Va dans l\'onboarding pour connecter Google Calendar')
      return
    }

    try {
      const parsed = JSON.parse(tokens)
      addLog('✅ Tokens trouvés dans localStorage')
      addLog(`  - access_token: ${parsed.access_token ? '✓ Présent' : '✗ Manquant'}`)
      addLog(`  - refresh_token: ${parsed.refresh_token ? '✓ Présent' : '✗ Manquant'}`)
      addLog(`  - expires_at: ${parsed.expires_at ? new Date(parsed.expires_at).toLocaleString() : '✗ Manquant'}`)
      
      if (parsed.expires_at) {
        const now = Date.now()
        const isExpired = now > parsed.expires_at
        addLog(`  - Statut: ${isExpired ? '⚠️ EXPIRÉ' : '✅ VALIDE'}`)
      }
    } catch (error) {
      addLog('❌ Erreur lors du parsing des tokens')
      console.error(error)
    }
  }

  const disconnectCalendar = () => {
    localStorage.removeItem('google_tokens')
    addLog('✅ Tokens supprimés')
    addLog('👉 Reconnecte ton Google Calendar dans l\'onboarding')
  }

  return (
    <div className="min-h-screen bg-mint p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-text-dark mb-2 font-quicksand">
            🧪 Test Google Calendar API
          </h1>
          <p className="text-text-muted text-sm mb-6">
            Page de test pour valider l&apos;intégration Google Calendar
          </p>

          {/* Boutons de test */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              onClick={checkTokens}
              variant="secondary"
              disabled={isLoading}
            >
              🔑 Vérifier tokens
            </Button>

            <Button
              onClick={testGetEvents}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : '📋 Récupérer événements'}
            </Button>

            <Button
              onClick={testFindSlots}
              disabled={isLoading}
            >
              {isLoading ? 'Recherche...' : '🎯 Trouver créneaux libres'}
            </Button>

            <Button
              onClick={testCreateEvent}
              disabled={isLoading}
            >
              {isLoading ? 'Création...' : '➕ Créer événement test'}
            </Button>

            <Button
              onClick={disconnectCalendar}
              variant="secondary"
              disabled={isLoading}
            >
              🔌 Déconnecter Calendar
            </Button>
          </div>

          {/* Zone de logs */}
          <div className="bg-gray-50 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Clique sur un bouton pour lancer un test
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-700">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div className="flex gap-3 mt-4">
            <Button
              onClick={clearLogs}
              variant="secondary"
              className="flex-1"
              disabled={isLoading}
            >
              🗑️ Effacer logs
            </Button>

            <Button
              onClick={() => window.location.href = '/onboarding/step4'}
              variant="secondary"
              className="flex-1"
              disabled={isLoading}
            >
              🔗 Aller à onboarding
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📖 Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Clique sur &quot;🔑 Vérifier tokens&quot; pour voir si Google Calendar est connecté</li>
            <li>Si non connecté, va dans &quot;Aller à onboarding&quot; pour connecter</li>
            <li>Une fois connecté, clique sur &quot;📋 Récupérer événements&quot;</li>
            <li>Puis teste &quot;➕ Créer événement test&quot; et vérifie dans ton Google Calendar</li>
            <li>Utilise &quot;🔌 Déconnecter Calendar&quot; pour tester les erreurs de tokens manquants</li>
          </ol>
        </div>
      </div>
    </div>
  )
}