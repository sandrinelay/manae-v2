/**
 * Test de génération des créneaux
 * Teste directement findAvailableSlots avec différentes contraintes temporelles
 * Exécuter avec: npx tsx scripts/test-slots-generation.ts
 */

import {
  findAvailableSlots,
  selectTop3Diversified
} from '../features/schedule/services/slots.service'
import type { TemporalConstraint } from '../types/items'

// Date de référence: Lundi 5 janvier 2026 à 10h
const TODAY = new Date('2026-01-05T10:00:00')

// Simuler des contraintes utilisateur (indisponibilités)
// Exemple: travail lundi-vendredi 9h-12h et 14h-18h
const USER_CONSTRAINTS = [
  {
    id: '1',
    user_id: 'test',
    name: 'Travail matin',
    category: 'work' as const,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    start_time: '09:00',
    end_time: '12:00',
    allow_lunch_break: true,
    created_at: ''
  },
  {
    id: '2',
    user_id: 'test',
    name: 'Travail après-midi',
    category: 'work' as const,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    start_time: '14:00',
    end_time: '18:00',
    allow_lunch_break: false,
    created_at: ''
  }
]

// Pas d'événements calendar pour simplifier
const CALENDAR_EVENTS: never[] = []

interface TestCase {
  name: string
  taskContent: string
  temporalConstraint: TemporalConstraint | null
  expectedDays: string[]
  expectedTimeRange?: string
}

const testCases: TestCase[] = [
  // 1. FIXED_DATE avec heure
  {
    name: 'Réunion mardi 14h',
    taskContent: 'Réunion mardi 14h',
    temporalConstraint: {
      type: 'fixed_date',
      date: '2026-01-06T14:00:00',
      urgency: 'medium'
    },
    expectedDays: ['2026-01-06'],
    expectedTimeRange: '14:00-15:00'
  },

  // 2. FIXED_DATE sans heure (jour entier) - utiliser lundi prochain (12 janvier)
  {
    name: 'Commencer régime lundi prochain',
    taskContent: 'Commencer régime lundi',
    temporalConstraint: {
      type: 'fixed_date',
      date: '2026-01-12',
      urgency: 'low'
    },
    expectedDays: ['2026-01-12'],
    expectedTimeRange: 'toute la journée'
  },

  // 3. TIME_RANGE matin - utiliser lundi prochain (12 janvier)
  {
    name: 'Appeler comptable lundi matin',
    taskContent: 'Appeler comptable lundi matin',
    temporalConstraint: {
      type: 'time_range',
      startDate: '2026-01-12T08:00:00',
      endDate: '2026-01-12T12:00:00',
      urgency: 'medium',
      rawPattern: 'lundi matin'
    },
    expectedDays: ['2026-01-12'],
    expectedTimeRange: '08:00-12:00'
  },

  // 4. TIME_RANGE après-midi avec service (banque)
  {
    name: 'RDV banque jeudi après-midi',
    taskContent: 'RDV banque jeudi après-midi',
    temporalConstraint: {
      type: 'time_range',
      startDate: '2026-01-08T14:00:00',
      endDate: '2026-01-08T18:00:00',
      urgency: 'medium',
      rawPattern: 'jeudi après-midi'
    },
    expectedDays: ['2026-01-08'],
    expectedTimeRange: '14:00-16:30 (horaires banque)'
  },

  // 5. DEADLINE
  {
    name: 'Finir rapport avant vendredi',
    taskContent: 'Finir rapport avant vendredi',
    temporalConstraint: {
      type: 'deadline',
      date: '2026-01-09',
      urgency: 'high'
    },
    expectedDays: ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'],
    expectedTimeRange: 'créneaux disponibles avant vendredi'
  },

  // 6. ASAP
  {
    name: 'Urgent rappeler client',
    taskContent: 'Urgent rappeler client',
    temporalConstraint: {
      type: 'asap',
      urgency: 'critical'
    },
    expectedDays: ['premiers jours disponibles'],
    expectedTimeRange: 'premiers créneaux'
  },

  // 7. START_DATE
  {
    name: 'Reprendre sport à partir de mardi',
    taskContent: 'Reprendre sport à partir de mardi',
    temporalConstraint: {
      type: 'start_date',
      startDate: '2026-01-06T00:00:00',
      urgency: 'low'
    },
    expectedDays: ['2026-01-06 et après'],
    expectedTimeRange: 'tous créneaux à partir de mardi'
  },

  // 8. Sans contrainte - service médical
  {
    name: 'Appeler le dentiste',
    taskContent: 'Appeler le dentiste',
    temporalConstraint: null,
    expectedDays: ['Lun-Ven'],
    expectedTimeRange: '09:00-18:00 (service médical)'
  },

  // 9. Sans contrainte - service administratif
  {
    name: 'Aller à la poste',
    taskContent: 'Aller à la poste',
    temporalConstraint: null,
    expectedDays: ['Lun-Sam'],
    expectedTimeRange: '09:00-16:30 (service administratif)'
  },

  // 10. Sans contrainte - pas de service
  {
    name: 'Ranger le garage',
    taskContent: 'Ranger le garage',
    temporalConstraint: null,
    expectedDays: ['tous les jours'],
    expectedTimeRange: 'selon dispos utilisateur'
  }
]

function formatSlot(slot: { date: string; startTime: string; endTime: string }): string {
  const date = new Date(slot.date)
  const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dayNum = date.getDate()
  return `${dayName} ${dayNum} ${slot.startTime}-${slot.endTime}`
}

async function runTests() {
  console.log('='.repeat(80))
  console.log('TEST DE GÉNÉRATION DES CRÉNEAUX')
  console.log(`Date de référence: ${TODAY.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
  console.log('='.repeat(80))
  console.log()

  console.log('📋 Contraintes utilisateur simulées:')
  console.log('   - Travail Lun-Ven 9h-12h (indisponible)')
  console.log('   - Travail Lun-Ven 14h-18h (indisponible)')
  console.log('   → Disponible: 8h-9h, 12h-14h, 18h-21h en semaine')
  console.log('   → Disponible: toute la journée le week-end')
  console.log()

  for (const test of testCases) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`�� ${test.name}`)
    console.log(`   Contrainte: ${test.temporalConstraint?.type || 'aucune'}`)
    console.log(`   Attendu: ${test.expectedDays.join(', ')} | ${test.expectedTimeRange}`)

    try {
      const startDate = new Date(TODAY)
      const endDate = new Date(TODAY)
      endDate.setDate(endDate.getDate() + 14) // 2 semaines

      const result = await findAvailableSlots({
        durationMinutes: 30,
        constraints: USER_CONSTRAINTS,
        calendarEvents: CALENDAR_EVENTS,
        startDate,
        endDate,
        mood: 'calm',
        temporalConstraint: test.temporalConstraint,
        taskContent: test.taskContent
      })

      const top3 = selectTop3Diversified(result.slots)

      if (top3.length === 0) {
        console.log(`   ⚠️  Aucun créneau trouvé!`)
        if (result.serviceConstraint) {
          console.log(`   📌 Service détecté: ${result.serviceConstraint.type}`)
          console.log(`   📌 Raison: ${result.serviceConstraint.reason}`)
        }
      } else {
        console.log(`   ✅ ${result.slots.length} créneaux trouvés, top 3:`)
        top3.forEach((slot, i) => {
          console.log(`      ${i + 1}. ${formatSlot(slot)} (score: ${slot.score?.toFixed(2)})`)
        })

        if (result.serviceConstraint) {
          console.log(`   📌 Service: ${result.serviceConstraint.type} (${result.serviceConstraint.filteredCount} créneaux filtrés)`)
        }

        // Vérifier si les créneaux correspondent aux attentes
        const slotDays = [...new Set(top3.map(s => s.date))].sort()
        console.log(`   📅 Jours des créneaux: ${slotDays.join(', ')}`)
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error}`)
    }
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('FIN DES TESTS')
  console.log('='.repeat(80))
}

runTests().catch(console.error)
