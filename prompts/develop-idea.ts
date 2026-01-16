/**
 * Prompt de développement d'idées en projets
 * Transforme une idée floue en projet structuré avec étapes
 */

import { DEVELOP_IDEA_SYSTEM } from './system'
import type { PromptConfig, DevelopIdeaContext } from './types'

// ============================================
// CONFIGURATION
// ============================================

export const DEVELOP_IDEA_CONFIG: PromptConfig = {
  system: DEVELOP_IDEA_SYSTEM,
  temperature: 0.8,
  maxTokens: 1500,
  model: 'gpt-4o-mini'
}

// ============================================
// LABELS BLOCAGES
// ============================================

const BLOCKER_LABELS: Record<string, string> = {
  time: 'Manque de temps',
  budget: 'Budget limité',
  fear: 'Peur de mal faire / doutes',
  energy: "Manque d'énergie"
}

// ============================================
// BUILDER
// ============================================

/**
 * Construit le prompt de développement d'idée
 */
export function buildDevelopIdeaPrompt(context: DevelopIdeaContext): string {
  const { ideaText, ideaAge, blockers } = context

  // Contexte selon l'âge de l'idée
  let contextSection = ''

  if (ideaAge === 'fresh') {
    contextSection = `
CONTEXTE : Idée fraîche, capturée récemment.
OBJECTIF : Structurer en projet motivant et concret.
TON : Enthousiaste, encourageant, dynamique.`
  } else {
    const blockersList = blockers?.length
      ? blockers.map(b => BLOCKER_LABELS[b] || b).join(', ')
      : 'Non précisé'

    contextSection = `
CONTEXTE : Idée qui existe depuis longtemps mais n'avance pas.
BLOCAGES IDENTIFIÉS : ${blockersList}
OBJECTIF : Débloquer et relancer cette idée.
TON : Rassurant, empathique, pas culpabilisant.

ADAPTATION DES ÉTAPES SELON LES BLOCAGES :
- Manque de temps → Micro-étapes (5-15min max chacune)
- Budget limité → Étapes gratuites ou peu coûteuses en priorité
- Peur/doutes → Étapes de validation rapide, feedback tôt
- Manque d'énergie → Étapes légères, sans urgence`
  }

  return `L'utilisateur a cette idée : "${ideaText}"

${contextSection}

TÂCHES :
1. Reformule l'idée en titre clair et engageant (max 60 caractères)
2. Décompose en 3-5 étapes concrètes et actionnables
3. Estime le temps total réaliste
4. Estime le budget si applicable (sinon null)
5. Ajoute une phrase de motivation encourageante

RÈGLES :
- Chaque étape DOIT commencer par un verbe d'action à l'infinitif
- Étapes adaptées à une personne avec charge mentale élevée
- La 1ère étape DOIT être faisable en moins de 15 minutes
- Pas de jargon, langage simple et direct
- Budget en euros avec fourchette si applicable

FORMAT JSON (strict) :
{
  "refined_title": "Titre clair du projet (max 60 car)",
  "steps": [
    "Verbe + action concrète 1",
    "Verbe + action concrète 2",
    "Verbe + action concrète 3"
  ],
  "estimated_time": "Durée totale réaliste (ex: 3h sur 2 semaines)",
  "budget": "Fourchette en euros (ex: 50-100€) ou null",
  "motivation": "Phrase encourageante courte (max 100 car)"
}`
}
