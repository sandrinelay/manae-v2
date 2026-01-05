/**
 * Test E2E des contraintes temporelles
 * Exécuter avec: npx tsx scripts/test-e2e-temporal.ts
 *
 * Prérequis: Le serveur dev doit être lancé (npm run dev)
 */

// Date de référence pour les tests
const TODAY = new Date()
const TODAY_STR = TODAY.toLocaleDateString('fr-FR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

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

  // 7. Sans contrainte temporelle
  { input: 'Appeler le dentiste', expectedType: 'task', expectedConstraint: null, description: 'SANS CONTRAINTE - Tâche simple' },
  { input: 'Ranger le garage', expectedType: 'task', expectedConstraint: null, description: 'SANS CONTRAINTE - Tâche sans date' },

  // 8. Cas limites
  { input: "Réunion aujourd'hui 18h", expectedType: 'task', expectedConstraint: 'fixed_date', description: 'CAS LIMITE - Aujourd\'hui + heure' },
  { input: 'Rendez-vous dans 2 semaines', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'CAS LIMITE - Dans X semaines' },

  // 9. Contraintes de service
  { input: 'Appeler la banque', expectedType: 'task', expectedConstraint: null, description: 'SERVICE - Banque (heures bureau implicites)' },
  { input: 'RDV médecin', expectedType: 'task', expectedConstraint: null, description: 'SERVICE - Médecin (heures bureau implicites)' },
  { input: 'Aller à la poste', expectedType: 'task', expectedConstraint: null, description: 'SERVICE - Poste (heures ouverture implicites)' },

  // 10. Notes et idées (pas de contrainte temporelle)
  { input: 'Léa adore les licornes', expectedType: 'note', expectedConstraint: null, description: 'NOTE - Info famille' },
  { input: 'Partir au Japon un jour', expectedType: 'idea', expectedConstraint: null, description: 'IDÉE - Projet futur flou' },
  { input: 'Aller au ski en février 2027', expectedType: 'idea', expectedConstraint: null, description: 'IDÉE - Projet avec date lointaine' },
  { input: 'Reprendre sport après les vacances', expectedType: 'idea', expectedConstraint: null, description: 'IDÉE - Projet futur flou (date non résoluble)' },

  // 11. Courses (pas de contrainte temporelle)
  { input: 'Acheter du lait', expectedType: 'list_item', expectedConstraint: null, description: 'COURSES - Produit simple' },
  { input: 'lait pain oeufs', expectedType: 'list_item', expectedConstraint: null, description: 'COURSES - Liste brute' },
]

interface AnalysisResult {
  items: Array<{
    content: string
    type: string
    state: string
    context?: string
    ai_analysis?: {
      temporal_constraint?: {
        type: string
        date?: string
        startDate?: string
        endDate?: string
        urgency?: string
        rawPattern?: string
      } | null
    }
  }>
  raw_input: string
  warning?: string
}

async function analyzeText(text: string): Promise<AnalysisResult | null> {
  try {
    const response = await fetch('http://localhost:3000/api/analyze-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: En dev, l'auth est bypassée ou on utilise un token de test
      },
      body: JSON.stringify({ rawText: text })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`  ❌ Erreur API: ${response.status} - ${error}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`  ❌ Erreur réseau:`, error)
    return null
  }
}

function formatConstraint(constraint: AnalysisResult['items'][0]['ai_analysis']): string {
  if (!constraint?.temporal_constraint) return 'null'

  const tc = constraint.temporal_constraint
  let details = `type: ${tc.type}`

  if (tc.date) details += `, date: ${tc.date}`
  if (tc.startDate) details += `, startDate: ${tc.startDate}`
  if (tc.endDate) details += `, endDate: ${tc.endDate}`
  if (tc.urgency) details += `, urgency: ${tc.urgency}`

  return details
}

async function runTests() {
  console.log('='.repeat(80))
  console.log('TEST E2E DES CONTRAINTES TEMPORELLES')
  console.log(`Date du test: ${TODAY_STR}`)
  console.log('='.repeat(80))
  console.log()

  let passed = 0
  let failed = 0
  let skipped = 0

  for (const test of testCases) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`📝 "${test.input}"`)
    console.log(`   Attendu: type=${test.expectedType}, constraint=${test.expectedConstraint || 'null'}`)

    const result = await analyzeText(test.input)

    if (!result) {
      console.log(`   ⏭️  SKIPPED (erreur API)`)
      skipped++
      continue
    }

    if (result.warning) {
      console.log(`   ⚠️  Warning: ${result.warning}`)
    }

    const item = result.items[0]
    if (!item) {
      console.log(`   ❌ FAILED: Aucun item retourné`)
      failed++
      continue
    }

    const actualType = item.type
    const actualConstraint = item.ai_analysis?.temporal_constraint?.type || null

    const typeMatch = actualType === test.expectedType
    const constraintMatch = actualConstraint === test.expectedConstraint

    if (typeMatch && constraintMatch) {
      console.log(`   ✅ PASSED`)
      console.log(`      Type: ${actualType}`)
      console.log(`      Constraint: ${formatConstraint(item.ai_analysis)}`)
      passed++
    } else {
      console.log(`   ❌ FAILED`)
      console.log(`      Type: ${actualType} ${typeMatch ? '✓' : `✗ (attendu: ${test.expectedType})`}`)
      console.log(`      Constraint: ${formatConstraint(item.ai_analysis)} ${constraintMatch ? '✓' : `✗ (attendu: ${test.expectedConstraint})`}`)
      failed++
    }

    // Petite pause pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('RÉSUMÉ')
  console.log('='.repeat(80))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`Total: ${testCases.length}`)
  console.log()

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(console.error)
