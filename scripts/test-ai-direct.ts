/**
 * Test direct de l'analyse IA sans authentification
 * Appelle OpenAI directement avec le prompt d'analyse
 * Exécuter avec: npx tsx scripts/test-ai-direct.ts
 */

import OpenAI from 'openai'
import { readFileSync } from 'fs'
import { buildAnalyzePrompt, ANALYZE_CONFIG, SYSTEM_PROMPT } from '../prompts'

// Charger les variables d'environnement depuis .env.local
try {
  const envContent = readFileSync('.env.local', 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch {
  console.log('Note: .env.local not found, using existing env vars')
}

// Date de référence pour les tests
const TODAY = new Date('2026-01-05T10:00:00')
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
  // ============================================
  // PENSÉES MAMAN (2 enfants : Emma 3 ans, Léo 6 ans)
  // ============================================

  // Tâches quotidiennes
  { input: 'Prendre RDV pédiatre pour Emma', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - RDV médical enfant' },
  { input: 'Acheter des couches taille 4', expectedType: 'list_item', expectedConstraint: null, description: 'MAMAN - Course bébé' },
  { input: 'Inscrire Léo au foot', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - Inscription activité' },
  { input: 'Rappeler la nounou pour vendredi', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'MAMAN - Appel avec jour' },
  { input: 'Commander le gâteau d\'anniversaire de Léo', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - Commande' },
  { input: 'Préparer le sac de piscine pour demain', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'MAMAN - Préparation demain' },
  { input: 'Acheter des chaussures neuves pour Emma', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - Achat contextuel enfant' },
  { input: 'RDV orthophoniste mardi 16h', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'MAMAN - RDV jour+heure' },
  { input: 'Urgent rappeler la maîtresse', expectedType: 'task', expectedConstraint: 'asap', description: 'MAMAN - Appel urgent école' },
  { input: 'Récupérer carnet de santé chez le médecin', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - Tâche administrative' },

  // Tâches avec contraintes temporelles
  { input: 'Réunion parents d\'élèves jeudi 18h', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'MAMAN - Réunion école' },
  { input: 'Spectacle de fin d\'année vendredi 14h', expectedType: 'task', expectedConstraint: 'fixed_date', description: 'MAMAN - Événement école' },
  { input: 'Vaccin Emma avant le 15', expectedType: 'task', expectedConstraint: 'deadline', description: 'MAMAN - Deadline vaccin' },
  { input: 'Acheter cadeau anniversaire Théo avant samedi', expectedType: 'task', expectedConstraint: 'deadline', description: 'MAMAN - Deadline cadeau' },
  { input: 'Appeler crèche lundi matin', expectedType: 'task', expectedConstraint: 'time_range', description: 'MAMAN - Appel matin' },
  { input: 'Kermesse de l\'école samedi après-midi', expectedType: 'task', expectedConstraint: 'time_range', description: 'MAMAN - Événement après-midi' },

  // Courses enfants
  { input: 'Compotes pomme, petits suisses, jambon', expectedType: 'list_item', expectedConstraint: null, description: 'MAMAN - Liste courses enfants' },
  { input: 'Lait, pain de mie, céréales', expectedType: 'list_item', expectedConstraint: null, description: 'MAMAN - Liste courses petit-déj' },
  { input: 'Acheter du sérum phy', expectedType: 'list_item', expectedConstraint: null, description: 'MAMAN - Course pharmacie' },
  { input: 'Lingettes, couches, crème change', expectedType: 'list_item', expectedConstraint: null, description: 'MAMAN - Courses bébé' },

  // Notes famille
  { input: 'Emma allergique aux arachides', expectedType: 'note', expectedConstraint: null, description: 'MAMAN - Note allergie' },
  { input: 'Léo adore les dinosaures', expectedType: 'note', expectedConstraint: null, description: 'MAMAN - Note préférence enfant' },
  { input: 'Code portail école : 4589', expectedType: 'note', expectedConstraint: null, description: 'MAMAN - Note code' },
  { input: 'Pointure Emma : 26', expectedType: 'note', expectedConstraint: null, description: 'MAMAN - Note taille' },
  { input: 'Taille Léo : 6 ans', expectedType: 'note', expectedConstraint: null, description: 'MAMAN - Note taille vêtement' },
  { input: 'Doudou préféré Emma : lapin bleu', expectedType: 'note', expectedConstraint: null, description: 'MAMAN - Note doudou' },

  // Idées projets famille
  { input: 'Organiser anniversaire Léo thème pirates', expectedType: 'idea', expectedConstraint: null, description: 'MAMAN - Idée anniversaire' },
  { input: 'Partir à Disneyland cet été', expectedType: 'idea', expectedConstraint: null, description: 'MAMAN - Idée voyage' },
  { input: 'Inscrire Emma à la danse en septembre', expectedType: 'idea', expectedConstraint: null, description: 'MAMAN - Idée activité future' },
  { input: 'Refaire la chambre des enfants', expectedType: 'idea', expectedConstraint: null, description: 'MAMAN - Idée aménagement' },
  { input: 'Trouver une baby-sitter pour le week-end en amoureux', expectedType: 'idea', expectedConstraint: null, description: 'MAMAN - Idée organisation' },
  { input: 'Apprendre à faire du vélo à Emma', expectedType: 'idea', expectedConstraint: null, description: 'MAMAN - Idée apprentissage' },

  // Administratif enfants
  { input: 'Renouveler carte d\'identité Emma', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - Admin identité' },
  { input: 'Envoyer dossier inscription CP', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - Admin école' },
  { input: 'Payer la cantine avant vendredi', expectedType: 'task', expectedConstraint: 'deadline', description: 'MAMAN - Deadline paiement' },
  { input: 'Demander attestation assurance scolaire', expectedType: 'task', expectedConstraint: null, description: 'MAMAN - Admin assurance' },
]

interface AIItem {
  content: string
  type: string
  state: string
  context?: string
  temporal_constraint?: {
    type: string
    date?: string
    start_date?: string
    end_date?: string
    urgency?: string
    raw_pattern?: string
  } | null
}

interface AIResponse {
  items: AIItem[]
}

async function analyzeText(openai: OpenAI, text: string): Promise<AIResponse | null> {
  try {
    const prompt = buildAnalyzePrompt({
      rawText: text,
      today: TODAY
    })

    const completion = await openai.chat.completions.create({
      model: ANALYZE_CONFIG.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: ANALYZE_CONFIG.temperature,
      max_tokens: ANALYZE_CONFIG.maxTokens
    })

    const content = completion.choices[0].message.content || ''
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    return JSON.parse(cleanContent)
  } catch (error) {
    console.error(`  ❌ Erreur:`, error)
    return null
  }
}

function formatConstraint(constraint: AIItem['temporal_constraint']): string {
  if (!constraint) return 'null'

  let details = `type: ${constraint.type}`
  if (constraint.date) details += `, date: ${constraint.date}`
  if (constraint.start_date) details += `, start_date: ${constraint.start_date}`
  if (constraint.end_date) details += `, end_date: ${constraint.end_date}`
  if (constraint.urgency) details += `, urgency: ${constraint.urgency}`

  return details
}

async function runTests() {
  // Vérifier API key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY non configurée')
    console.log('   Exporter la variable: export OPENAI_API_KEY=sk-...')
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey })

  console.log('='.repeat(80))
  console.log('TEST DIRECT IA - PENSÉES MAMAN')
  console.log(`Date de référence: ${TODAY_STR}`)
  console.log('='.repeat(80))
  console.log()

  let passed = 0
  let failed = 0
  let skipped = 0

  const results: Array<{
    input: string
    description: string
    expectedType: string
    expectedConstraint: string | null
    actualType: string | null
    actualConstraint: string | null
    typeMatch: boolean
    constraintMatch: boolean
    status: 'PASSED' | 'FAILED' | 'SKIPPED'
  }> = []

  for (const test of testCases) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`📝 "${test.input}"`)
    console.log(`   Attendu: type=${test.expectedType}, constraint=${test.expectedConstraint || 'null'}`)

    const result = await analyzeText(openai, test.input)

    if (!result) {
      console.log(`   ⏭️  SKIPPED (erreur API)`)
      skipped++
      results.push({
        input: test.input,
        description: test.description,
        expectedType: test.expectedType,
        expectedConstraint: test.expectedConstraint,
        actualType: null,
        actualConstraint: null,
        typeMatch: false,
        constraintMatch: false,
        status: 'SKIPPED'
      })
      continue
    }

    const item = result.items[0]
    if (!item) {
      console.log(`   ❌ FAILED: Aucun item retourné`)
      failed++
      results.push({
        input: test.input,
        description: test.description,
        expectedType: test.expectedType,
        expectedConstraint: test.expectedConstraint,
        actualType: null,
        actualConstraint: null,
        typeMatch: false,
        constraintMatch: false,
        status: 'FAILED'
      })
      continue
    }

    const actualType = item.type
    const actualConstraint = item.temporal_constraint?.type || null

    const typeMatch = actualType === test.expectedType
    const constraintMatch = actualConstraint === test.expectedConstraint

    if (typeMatch && constraintMatch) {
      console.log(`   ✅ PASSED`)
      console.log(`      Type: ${actualType} | Context: ${item.context || 'N/A'}`)
      console.log(`      Constraint: ${formatConstraint(item.temporal_constraint)}`)
      passed++
      results.push({
        input: test.input,
        description: test.description,
        expectedType: test.expectedType,
        expectedConstraint: test.expectedConstraint,
        actualType,
        actualConstraint,
        typeMatch: true,
        constraintMatch: true,
        status: 'PASSED'
      })
    } else {
      console.log(`   ❌ FAILED`)
      console.log(`      Type: ${actualType} ${typeMatch ? '✓' : `✗ (attendu: ${test.expectedType})`}`)
      console.log(`      Constraint: ${formatConstraint(item.temporal_constraint)} ${constraintMatch ? '✓' : `✗ (attendu: ${test.expectedConstraint})`}`)
      failed++
      results.push({
        input: test.input,
        description: test.description,
        expectedType: test.expectedType,
        expectedConstraint: test.expectedConstraint,
        actualType,
        actualConstraint,
        typeMatch,
        constraintMatch,
        status: 'FAILED'
      })
    }

    // Petite pause pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 300))
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

  // Afficher tableau récapitulatif des échecs
  const failures = results.filter(r => r.status === 'FAILED')
  if (failures.length > 0) {
    console.log('='.repeat(80))
    console.log('ÉCHECS DÉTAILLÉS')
    console.log('='.repeat(80))
    console.log()
    console.log('| Input | Attendu | Obtenu |')
    console.log('|-------|---------|--------|')
    for (const f of failures) {
      const shortInput = f.input.length > 30 ? f.input.substring(0, 27) + '...' : f.input
      const expected = `${f.expectedType}/${f.expectedConstraint || '-'}`
      const actual = `${f.actualType || '?'}/${f.actualConstraint || '-'}`
      console.log(`| ${shortInput.padEnd(30)} | ${expected.padEnd(15)} | ${actual.padEnd(15)} |`)
    }
  }

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(console.error)
