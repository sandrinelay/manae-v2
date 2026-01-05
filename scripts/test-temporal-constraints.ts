/**
 * Script de test des contraintes temporelles
 * Exécuter avec: npx tsx scripts/test-temporal-constraints.ts
 */

import { buildAnalyzePrompt } from '../prompts/analyze'

// Date de test: 2 janvier 2026 (jeudi)
const TEST_DATE = new Date('2026-01-02T10:00:00')

interface TestCase {
  input: string
  expectedType: string
  expectedConstraint: string | null
  description: string
}

const testCases: TestCase[] = [
  // 1. FIXED_DATE (RDV précis)
  { input: 'Réunion mardi 14h', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'FIXED_DATE - Réunion à heure précise' },
  { input: 'Appeler le médecin demain 10h', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'FIXED_DATE - Appel demain heure précise' },
  { input: 'RDV coiffeur vendredi 9h30', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'FIXED_DATE - RDV jour + heure' },

  // 2. TIME_RANGE (Plage horaire sur un jour)
  { input: 'Réunion mardi avant 14h', expectedType: 'task', expectedConstraint: 'time_range', description: 'TIME_RANGE - Avant une heure sur un jour' },
  { input: 'RDV banque jeudi après-midi', expectedType: 'task', expectedConstraint: 'time_range', description: 'TIME_RANGE - Après-midi' },
  { input: 'Appeler comptable lundi matin', expectedType: 'task', expectedConstraint: 'time_range', description: 'TIME_RANGE - Matin' },

  // 3. DEADLINE (Avant une date)
  { input: 'Finir rapport avant vendredi', expectedType: 'task', expectedConstraint: 'deadline', description: 'DEADLINE - Avant un jour' },
  { input: 'Payer facture avant le 15', expectedType: 'task', expectedConstraint: 'deadline', description: 'DEADLINE - Avant une date' },
  { input: 'Rendre dossier avant lundi', expectedType: 'task', expectedConstraint: 'deadline', description: 'DEADLINE - Avant jour de la semaine' },

  // 4. ASAP (Urgent)
  { input: 'Urgent rappeler client', expectedType: 'task', expectedConstraint: 'asap', description: 'ASAP - Mot urgent' },
  { input: 'Asap envoyer devis', expectedType: 'task', expectedConstraint: 'asap', description: 'ASAP - Mot asap' },
  { input: 'Vite répondre mail important', expectedType: 'task', expectedConstraint: 'asap', description: 'ASAP - Mot vite' },

  // 5. FIXED_DATE (Action à faire un jour précis)
  { input: 'Commencer régime lundi', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'FIXED_DATE - Action prévue lundi' },

  // 6. START_DATE (À partir de)
  { input: 'Reprendre sport à partir de mardi', expectedType: 'task', expectedConstraint: 'start_date', description: 'START_DATE - À partir de mardi' },

  // 6. Sans contrainte temporelle
  { input: 'Appeler le dentiste', expectedType: 'task', expectedConstraint: null, description: 'SANS CONTRAINTE - Tâche simple' },
  { input: 'Ranger le garage', expectedType: 'task', expectedConstraint: null, description: 'SANS CONTRAINTE - Tâche sans date' },

  // 7. Cas limites
  { input: 'Réunion aujourd\'hui 18h', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'CAS LIMITE - Aujourd\'hui + heure' },
  { input: 'Rendez-vous dans 2 semaines', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'CAS LIMITE - Dans X semaines' },

  // 8. Contraintes de service
  { input: 'Appeler la banque', expectedType: 'task', expectedConstraint: null, description: 'SERVICE - Banque (heures bureau implicites)' },
  { input: 'RDV médecin', expectedType: 'task', expectedConstraint: null, description: 'SERVICE - Médecin (heures bureau implicites)' },
  { input: 'Aller à la poste', expectedType: 'task', expectedConstraint: null, description: 'SERVICE - Poste (heures ouverture implicites)' },

  // 9. Notes et idées (pas de contrainte temporelle)
  { input: 'Léa adore les licornes', expectedType: 'note', expectedConstraint: null, description: 'NOTE - Info famille' },
  { input: 'Partir au Japon un jour', expectedType: 'idea', expectedConstraint: null, description: 'IDÉE - Projet futur flou' },
  { input: 'Aller au ski en février 2027', expectedType: 'idea', expectedConstraint: null, description: 'IDÉE - Projet avec date lointaine' },
  { input: 'Reprendre sport après les vacances', expectedType: 'idea', expectedConstraint: null, description: 'IDÉE - Projet futur flou (date non résoluble)' },

  // 10. Courses (pas de contrainte temporelle)
  { input: 'Acheter du lait', expectedType: 'list_item', expectedConstraint: null, description: 'COURSES - Produit simple' },
  { input: 'lait pain oeufs', expectedType: 'list_item', expectedConstraint: null, description: 'COURSES - Liste brute' },
]

console.log('='.repeat(80))
console.log('TEST DES CONTRAINTES TEMPORELLES')
console.log(`Date de test: ${TEST_DATE.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
console.log('='.repeat(80))
console.log()

// Afficher le prompt généré pour quelques cas clés
const keyTests = [
  'Réunion mardi 14h',
  'Réunion mardi avant 14h',
  'Finir rapport avant vendredi',
  'Urgent rappeler client'
]

for (const input of keyTests) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`INPUT: "${input}"`)
  console.log('─'.repeat(60))

  const prompt = buildAnalyzePrompt({
    rawText: input,
    today: TEST_DATE
  })

  // Extraire les parties pertinentes du prompt
  const lines = prompt.split('\n')
  const penseeIndex = lines.findIndex(l => l.includes('PENSÉE'))
  const todayIndex = lines.findIndex(l => l.includes("AUJOURD'HUI"))

  if (penseeIndex >= 0) console.log(lines[penseeIndex])
  if (todayIndex >= 0) {
    console.log(lines[todayIndex])
    console.log(lines[todayIndex + 1]) // DEMAIN
    console.log(lines[todayIndex + 2]) // JOURS
  }
}

console.log('\n')
console.log('='.repeat(80))
console.log('CHECKLIST DES TESTS À EFFECTUER MANUELLEMENT DANS L\'APP')
console.log('='.repeat(80))

for (const test of testCases) {
  const constraintLabel = test.expectedConstraint || 'aucune'
  console.log(`\n[ ] ${test.description}`)
  console.log(`    Input: "${test.input}"`)
  console.log(`    Attendu: type=${test.expectedType}, constraint=${constraintLabel}`)
}

console.log('\n')
console.log('='.repeat(80))
console.log('RÉSUMÉ DES RÈGLES')
console.log('='.repeat(80))
console.log(`
FIXED_DATE:   "[jour] [heure]" ou "à [heure]" → RDV précis à cette heure
TIME_RANGE:   "[jour] avant [heure]" → CE jour, avant l'heure
              "[jour] matin/après-midi" → CE jour, plage horaire
DEADLINE:     "avant [jour]" (sans heure) → N'importe quand avant ce jour
ASAP:         "urgent", "asap", "vite" → Premiers créneaux disponibles
START_DATE:   "à partir de", "commencer le" → Après cette date
`)
