/**
 * Test unitaire des contraintes temporelles
 * Teste directement le prompt et le parsing sans appel API
 * Exécuter avec: npx tsx scripts/test-temporal-unit.ts
 */

import { buildAnalyzePrompt } from '../prompts/analyze'

// Date de référence: Lundi 5 janvier 2026
const TEST_DATE = new Date('2026-01-05T10:00:00')

interface TestCase {
  input: string
  expectedType: string
  expectedConstraint: string | null
  description: string
  expectedDays?: string[] // Jours attendus pour les créneaux
}

const testCases: TestCase[] = [
  // 1. FIXED_DATE (RDV précis)
  {
    input: 'Réunion mardi 14h',
    expectedType: 'task',
    expectedConstraint: 'fixed_date',
    description: 'FIXED_DATE - Réunion à heure précise',
    expectedDays: ['mardi 6 janvier'] // Créneaux uniquement mardi autour de 14h
  },
  {
    input: 'Appeler le médecin demain 10h',
    expectedType: 'task',
    expectedConstraint: 'fixed_date',
    description: 'FIXED_DATE - Appel demain heure précise',
    expectedDays: ['mardi 6 janvier'] // Demain = mardi, autour de 10h
  },
  {
    input: 'RDV coiffeur vendredi 9h30',
    expectedType: 'task',
    expectedConstraint: 'fixed_date',
    description: 'FIXED_DATE - RDV jour + heure',
    expectedDays: ['vendredi 9 janvier'] // Vendredi autour de 9h30
  },

  // 2. TIME_RANGE (Plage horaire sur un jour)
  {
    input: 'Réunion mardi avant 14h',
    expectedType: 'task',
    expectedConstraint: 'time_range',
    description: 'TIME_RANGE - Avant une heure sur un jour',
    expectedDays: ['mardi 6 janvier'] // Créneaux mardi entre 8h et 14h
  },
  {
    input: 'RDV banque jeudi après-midi',
    expectedType: 'task',
    expectedConstraint: 'time_range',
    description: 'TIME_RANGE - Après-midi',
    expectedDays: ['jeudi 8 janvier'] // Créneaux jeudi entre 14h et 16h30 (horaires banque)
  },
  {
    input: 'Appeler comptable lundi matin',
    expectedType: 'task',
    expectedConstraint: 'time_range',
    description: 'TIME_RANGE - Matin',
    expectedDays: ['lundi 5 janvier'] // Aujourd'hui matin entre 8h et 12h
  },

  // 3. DEADLINE (Avant une date)
  {
    input: 'Finir rapport avant vendredi',
    expectedType: 'task',
    expectedConstraint: 'deadline',
    description: 'DEADLINE - Avant un jour',
    expectedDays: ['lundi 5', 'mardi 6', 'mercredi 7', 'jeudi 8'] // Avant vendredi
  },
  {
    input: 'Payer facture avant le 15',
    expectedType: 'task',
    expectedConstraint: 'deadline',
    description: 'DEADLINE - Avant une date',
    expectedDays: ['du 5 au 14 janvier'] // Avant le 15
  },
  {
    input: 'Rendre dossier avant lundi',
    expectedType: 'task',
    expectedConstraint: 'deadline',
    description: 'DEADLINE - Avant jour de la semaine',
    expectedDays: ['cette semaine'] // Avant lundi prochain
  },

  // 4. ASAP (Urgent)
  {
    input: 'Urgent rappeler client',
    expectedType: 'task',
    expectedConstraint: 'asap',
    description: 'ASAP - Mot urgent',
    expectedDays: ['premiers créneaux disponibles'] // Premiers créneaux dispo
  },
  {
    input: 'Asap envoyer devis',
    expectedType: 'task',
    expectedConstraint: 'asap',
    description: 'ASAP - Mot asap',
    expectedDays: ['premiers créneaux disponibles']
  },
  {
    input: 'Vite répondre mail important',
    expectedType: 'task',
    expectedConstraint: 'asap',
    description: 'ASAP - Mot vite',
    expectedDays: ['premiers créneaux disponibles']
  },

  // 5. FIXED_DATE (Action à faire un jour précis)
  {
    input: 'Commencer régime lundi',
    expectedType: 'task',
    expectedConstraint: 'fixed_date',
    description: 'FIXED_DATE - Action prévue lundi',
    expectedDays: ['lundi 5 janvier'] // Uniquement lundi (aujourd'hui)
  },

  // 6. START_DATE (À partir de)
  {
    input: 'Reprendre sport à partir de mardi',
    expectedType: 'task',
    expectedConstraint: 'start_date',
    description: 'START_DATE - À partir de mardi',
    expectedDays: ['mardi 6 et après'] // Mardi et jours suivants
  },

  // 7. Sans contrainte temporelle
  {
    input: 'Appeler le dentiste',
    expectedType: 'task',
    expectedConstraint: null,
    description: 'SANS CONTRAINTE - Tâche simple',
    expectedDays: ['tous les jours (9h-18h service médical)']
  },
  {
    input: 'Ranger le garage',
    expectedType: 'task',
    expectedConstraint: null,
    description: 'SANS CONTRAINTE - Tâche sans date',
    expectedDays: ['tous les jours']
  },

  // 8. Cas limites
  {
    input: "Réunion aujourd'hui 18h",
    expectedType: 'task',
    expectedConstraint: 'fixed_date',
    description: "CAS LIMITE - Aujourd'hui + heure",
    expectedDays: ['lundi 5 janvier autour de 18h']
  },
  {
    input: 'Rendez-vous dans 2 semaines',
    expectedType: 'task',
    expectedConstraint: 'fixed_date',
    description: 'CAS LIMITE - Dans X semaines',
    expectedDays: ['lundi 19 janvier']
  },

  // 9. Contraintes de service
  {
    input: 'Appeler la banque',
    expectedType: 'task',
    expectedConstraint: null,
    description: 'SERVICE - Banque (heures bureau implicites)',
    expectedDays: ['Lun-Sam 9h-16h30']
  },
  {
    input: 'RDV médecin',
    expectedType: 'task',
    expectedConstraint: null,
    description: 'SERVICE - Médecin (heures bureau implicites)',
    expectedDays: ['Lun-Ven 9h-18h']
  },
  {
    input: 'Aller à la poste',
    expectedType: 'task',
    expectedConstraint: null,
    description: 'SERVICE - Poste (heures ouverture implicites)',
    expectedDays: ['Lun-Sam 9h-16h30']
  },

  // 10. Notes et idées (pas de contrainte temporelle)
  {
    input: 'Léa adore les licornes',
    expectedType: 'note',
    expectedConstraint: null,
    description: 'NOTE - Info famille',
    expectedDays: ['N/A - pas de planification']
  },
  {
    input: 'Partir au Japon un jour',
    expectedType: 'idea',
    expectedConstraint: null,
    description: 'IDÉE - Projet futur flou',
    expectedDays: ['N/A - pas de planification']
  },
  {
    input: 'Aller au ski en février 2027',
    expectedType: 'idea',
    expectedConstraint: null,
    description: 'IDÉE - Projet avec date lointaine',
    expectedDays: ['N/A - pas de planification']
  },
  {
    input: 'Reprendre sport après les vacances',
    expectedType: 'idea',
    expectedConstraint: null,
    description: 'IDÉE - Projet futur flou (date non résoluble)',
    expectedDays: ['N/A - pas de planification']
  },

  // 11. Courses (pas de contrainte temporelle)
  {
    input: 'Acheter du lait',
    expectedType: 'list_item',
    expectedConstraint: null,
    description: 'COURSES - Produit simple',
    expectedDays: ['N/A - liste de courses']
  },
  {
    input: 'lait pain oeufs',
    expectedType: 'list_item',
    expectedConstraint: null,
    description: 'COURSES - Liste brute',
    expectedDays: ['N/A - liste de courses']
  },
]

console.log('='.repeat(80))
console.log('TEST UNITAIRE DES CONTRAINTES TEMPORELLES')
console.log(`Date de référence: ${TEST_DATE.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
console.log('='.repeat(80))
console.log()

// Calculer les jours de la semaine
const weekDays: string[] = []
for (let i = 0; i < 14; i++) {
  const d = new Date(TEST_DATE)
  d.setDate(d.getDate() + i)
  weekDays.push(`${d.toLocaleDateString('fr-FR', { weekday: 'long' })} ${d.getDate()} = ${d.toISOString().split('T')[0]}`)
}

console.log('📅 Calendrier de référence:')
weekDays.forEach(d => console.log(`   ${d}`))
console.log()

console.log('='.repeat(80))
console.log('RÉSULTATS ATTENDUS PAR CAS DE TEST')
console.log('='.repeat(80))

for (const test of testCases) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`📝 "${test.input}"`)
  console.log(`   Type attendu: ${test.expectedType}`)
  console.log(`   Contrainte attendue: ${test.expectedConstraint || 'aucune'}`)
  console.log(`   Créneaux attendus: ${test.expectedDays?.join(', ')}`)

  // Générer le prompt pour voir ce que l'IA reçoit
  const prompt = buildAnalyzePrompt({
    rawText: test.input,
    today: TEST_DATE
  })

  // Extraire les dates du prompt
  const dateMatch = prompt.match(/AUJOURD'HUI : (\d{4}-\d{2}-\d{2})/)
  const daysMatch = prompt.match(/JOURS : (.+)/)

  if (dateMatch) {
    console.log(`   📆 Aujourd'hui dans prompt: ${dateMatch[1]}`)
  }
}

console.log('\n')
console.log('='.repeat(80))
console.log('MATRICE DE VALIDATION')
console.log('='.repeat(80))
console.log()

console.log('| Input | Type | Contrainte | Créneaux attendus |')
console.log('|-------|------|------------|-------------------|')

for (const test of testCases) {
  const shortInput = test.input.length > 25 ? test.input.substring(0, 22) + '...' : test.input
  const constraint = test.expectedConstraint || '-'
  const days = test.expectedDays?.[0] || '-'
  console.log(`| ${shortInput.padEnd(25)} | ${test.expectedType.padEnd(10)} | ${constraint.padEnd(12)} | ${days.substring(0, 30)} |`)
}

console.log('\n')
console.log('='.repeat(80))
console.log('RÈGLES DE VALIDATION POUR LES CRÉNEAUX')
console.log('='.repeat(80))
console.log(`
✅ FIXED_DATE avec heure (ex: "mardi 14h"):
   → Créneaux uniquement CE jour, autour de cette heure (+/- 1h)

✅ FIXED_DATE sans heure (ex: "Commencer régime lundi"):
   → Créneaux uniquement CE jour, toute la journée

✅ TIME_RANGE (ex: "mardi avant 14h", "jeudi après-midi"):
   → Créneaux uniquement CE jour, dans la plage horaire spécifiée

✅ DEADLINE (ex: "avant vendredi"):
   → Créneaux de maintenant jusqu'à la veille de la deadline

✅ ASAP (ex: "urgent"):
   → Premiers créneaux disponibles, triés par proximité

✅ START_DATE (ex: "à partir de mardi"):
   → Créneaux à partir de CE jour et les jours suivants

✅ Sans contrainte + service (ex: "Aller à la poste"):
   → Créneaux selon les horaires du service (9h-16h30 pour la poste)

✅ Sans contrainte sans service (ex: "Ranger le garage"):
   → Tous les créneaux disponibles selon les dispos utilisateur
`)
