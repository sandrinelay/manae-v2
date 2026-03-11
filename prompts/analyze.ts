/**
 * Prompt d'analyse des pensées capturées
 * Approche "few-shot" : exemples concrets plutôt que longues règles
 */

import { ANALYSIS_SYSTEM } from './system'
import type { PromptConfig, AnalysisContext } from './types'

// ============================================
// CONFIGURATION
// ============================================

export const ANALYZE_CONFIG: PromptConfig = {
  system: ANALYSIS_SYSTEM,
  temperature: 0.2,
  maxTokens: 1500,
  model: 'gpt-4o-mini'
}

// ============================================
// EXEMPLES FEW-SHOT
// ============================================

const EXAMPLES = `
EXEMPLES (entrée → sortie attendue) :

1. TÂCHES — GARDER LE CONTENU ORIGINAL
⚠️ Ne PAS nettoyer le contenu des tâches. Garder les infos temporelles dans le texte.

TEMPORAL_CONSTRAINT — RÈGLES :
- "[jour] [heure]" ou "à [heure]" → type: "fixed_date"
- "[jour] avant [heure]" → type: "time_range" avec start_date=[jour]T08:00 et end_date=[jour]T[heure]
- "[jour] matin" → type: "time_range" start_date=[jour]T08:00 end_date=[jour]T12:00
- "[jour] après-midi" → type: "time_range" start_date=[jour]T14:00 end_date=[jour]T18:00
- "avant [jour]" (sans heure) → type: "deadline"
- "urgent", "asap" ou "vite" → type: "asap"
- "à partir de [jour]" → type: "start_date"
⚠️ PRIORITAIRES :
- "fin du mois" → type: "deadline" date = FIN DU MOIS (voir dates de référence)
- "début du mois prochain" → type: "fixed_date" date = DÉBUT MOIS PROCHAIN

TÂCHES CLASSIQUES :
"Appeler le dentiste" → { content: "Appeler le dentiste", type: "task", state: "active", context: "health" }
"Réunion mardi 14h" → { content: "Réunion mardi 14h", type: "task", state: "active", context: "work", temporal_constraint: { type: "fixed_date", date: "[mardi]T14:00:00" } }
"Finir rapport avant vendredi" → { content: "Finir rapport avant vendredi", type: "task", state: "active", context: "work", temporal_constraint: { type: "deadline", date: "[vendredi]", urgency: "high" } }
"Urgent rappeler client" → { content: "Urgent rappeler client", type: "task", state: "active", context: "work", temporal_constraint: { type: "asap", urgency: "critical" } }
"Appeler dentiste et pédiatre" → 2 items : { content: "Appeler le dentiste", context: "health" } + { content: "Appeler le pédiatre", context: "health" }

TÂCHES ADMIN (paperasse, banque, impôts) :
"Envoyer la déclaration d'impôts avant le 15" → { content: "Envoyer la déclaration d'impôts avant le 15", type: "task", state: "active", context: "admin", temporal_constraint: { type: "deadline", date: "[15 du mois]", urgency: "high" } }
"Appeler EDF fin du mois" → { content: "Appeler EDF fin du mois", type: "task", state: "active", context: "admin", temporal_constraint: { type: "deadline", date: "UTILISER LA DATE FIN DU MOIS INDIQUÉE CI-DESSOUS", urgency: "low" } }
"Renouveler assurance voiture" → { content: "Renouveler assurance voiture", type: "task", state: "active", context: "admin" }

TÂCHES HOME (maison, travaux) :
"Appeler le plombier pour la fuite" → { content: "Appeler le plombier pour la fuite", type: "task", state: "active", context: "home" }
"Acheter des ampoules pour le couloir" → { content: "Acheter des ampoules pour le couloir", type: "task", state: "active", context: "home" }

2. SAISIES VOCALES — cas difficiles
⚠️ Appliquer chain-of-thought : nettoyer hésitations → segmenter → classifier

"euh je sais pas... enfin si, rappeler le médecin pour Tom" → 1 item : { content: "Rappeler le médecin pour Tom", type: "task", state: "active", context: "health" }
"donc voilà faut que je pense à la déc... la déclaration d'impôts" → 1 item : { content: "Faire la déclaration d'impôts", type: "task", state: "active", context: "admin" }
"courses et aussi répondre à Patrick pour le devis" → 2 items : { content: "Courses", type: "task", context: "personal" } + { content: "Répondre à Patrick pour le devis", type: "task", context: "work" }
"faut que je pense à la décl d'impôts et acheter du pain" → 2 items : { content: "Faire la déclaration d'impôts", type: "task", context: "admin" } + { content: "Pain", type: "list_item", extracted_data: { category: "bakery" } }
"appeler... enfin écrire à la mairie pour les travaux" → 1 item : { content: "Écrire à la mairie pour les travaux", type: "task", state: "active", context: "home" }

3. NOTES (infos à retenir, pas d'action)
"Léa adore les licornes" → { content: "Léa adore les licornes", type: "note", state: "active", context: "family" }
"Emma allergique aux arachides" → { content: "Emma allergique aux arachides", type: "note", state: "active", context: "family" }
"Code WiFi: abc123" → { content: "Code WiFi: abc123", type: "note", state: "active", context: "home" }

4. IDÉES (projets futurs flous)
"Partir au Japon un jour" → { content: "Partir au Japon un jour", type: "idea", state: "captured", context: "personal" }
"Refaire la cuisine" → { content: "Refaire la cuisine", type: "idea", state: "captured", context: "home" }

5. COURSES (list_item) — NETTOYER le contenu + CATÉGORISER

CATÉGORIES (OBLIGATOIRE pour list_item) :
- bakery : pain, farine, brioche, croissant
- dairy : lait, œufs, fromage, beurre, yaourt, crème
- meat : viande, poisson, jambon, poulet, saucisse, lardons
- produce : fruits, légumes, banane, pomme, salade, compotes
- grocery : pâtes, riz, conserves, huile, sucre, sel, sauce
- frozen : surgelés, glace
- hygiene : savon, shampoing, dentifrice, PQ, sopalin
- household : lessive, liquide vaisselle, éponges
- drinks : eau, café, thé, jus, vin, bière
- baby : couches, lingettes, compotes bébé
- other : piles, ampoules, et tout le reste

"Acheter du lait" → { content: "Lait", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"6 œufs" → { content: "6 œufs", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"lait oeufs pain" → 3 items avec catégories (dairy, dairy, bakery)
"2 briques de lait" → { content: "2 briques de lait", extracted_data: { category: "dairy" } }

MIX COURSES + TÂCHE :
"lait pain et appeler nounou" → 3 items :
  - { content: "Lait", type: "list_item", extracted_data: { category: "dairy" } }
  - { content: "Pain", type: "list_item", extracted_data: { category: "bakery" } }
  - { content: "Appeler nounou", type: "task", context: "family" }
`

// ============================================
// RÈGLES CONCISES
// ============================================

const RULES = `
RÈGLES :
1. TYPE : task (action), note (info), idea (projet flou), list_item (courses alimentaires/ménage)
2. STATE : "active" si clair, "captured" si flou (ideas uniquement)
3. CONTEXT :
   - health : médical, santé, sport, pédiatre, dentiste, médecin
   - family : enfants, école, activités enfants, famille, nounou
   - work : professionnel, boulot, collègues, clients, réunions
   - personal : perso, loisirs, développement personnel, voyage, vacances
   - admin : banque, impôts, paperasse, assurance, administration, mairie, déclarations
   - home : maison, travaux, réparations, jardinage, plomberie, électricité, bricolage
4. DÉCOUPAGE : séparer si virgules/et avec entités ou contextes différents
5. COURSES : TOUJOURS nettoyer (supprimer "acheter du/de la/des", garder le produit)
6. TEMPORAL : détecter dates, heures, urgences

TASK vs IDEA :
- task = action simple, planifiable en 1 étape (RDV, appel, achat spécifique)
- idea = projet nécessitant réflexion, organisation, plusieurs étapes

Exemples :
- "Inscrire Léo au foot" → task (1 action : téléphoner/s'inscrire en ligne)
- "Organiser anniversaire Léo" → idea (plusieurs étapes : lieu, invités, gâteau...)
- "Acheter chaussures Emma" → task (1 action : aller au magasin)
- "Refaire la chambre des enfants" → idea (peinture, meubles, déco...)

TASK vs LIST_ITEM :
- list_item = produits alimentaires, ménagers, hygiène (liste de courses)
- task = achats spécifiques avec contexte (vêtements, équipement, cadeaux)

Exemples :
- "Acheter du lait" → list_item (course alimentaire)
- "Acheter des chaussures pour Emma" → task (achat contextuel enfant)
- "Acheter cadeau anniversaire Théo" → task (achat contextuel événement)
`

// ============================================
// FORMAT JSON
// ============================================

const JSON_FORMAT = `
FORMAT JSON (strict) :
{
  "items": [{
    "content": "⚠️ RÈGLE :
      - task/note/idea → CONTENU ORIGINAL (ne pas modifier, garder dates/heures)
      - list_item → PRODUIT SEULEMENT (nettoyer verbes et phrases)",
    "type": "task|note|idea|list_item",
    "state": "active|captured",
    "context": "personal|family|work|health|admin|home",
    "confidence": 0.0-1.0,
    "extracted_data": {
      "category": "pour list_item uniquement (bakery, dairy, meat, etc.)"
    },
    "temporal_constraint": {
      "type": "deadline|fixed_date|start_date|time_range|asap",
      "date": "ISO (pour deadline/fixed_date)",
      "start_date": "ISO (pour start_date/time_range)",
      "end_date": "ISO (pour time_range)",
      "urgency": "critical|high|medium|low",
      "raw_pattern": "expression originale"
    } ou null
  }]
}
`

// ============================================
// BUILDER
// ============================================

/**
 * Construit le prompt d'analyse complet
 */
export function buildAnalyzePrompt(context: AnalysisContext): string {
  const { rawText, today, historyContext, source, memoryContext } = context

  // Calculer les dates de référence
  const todayStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Fin du mois en cours
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

  // Début du mois prochain
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const startOfNextMonthStr = startOfNextMonth.toISOString().split('T')[0]

  // Jours de la semaine pour référence
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    weekDays.push(`${d.toLocaleDateString('fr-FR', { weekday: 'long' })} = ${d.toISOString().split('T')[0]}`)
  }

  const sourceNote = source === 'voice'
    ? `\n⚠️ SAISIE VOCALE : Ce texte a été dicté à voix haute. Tolère les fautes de syntaxe, phrases sans verbe, hésitations. Applique l'Étape 1 (Nettoyer) avec soin.\n`
    : ''

  // Section mémoire : injectée uniquement si des corrections existent
  const memorySection = memoryContext
    ? `\n## Préférences apprises de cet utilisateur\n${memoryContext}\nTiens compte de ces préférences pour ajuster ta classification.\n`
    : ''

  return `Analyse cette pensée et structure-la.
${sourceNote}
PENSÉE : "${rawText}"

DATES DE RÉFÉRENCE :
- AUJOURD'HUI : ${todayStr} (${dayOfWeek})
- DEMAIN : ${tomorrow.toISOString().split('T')[0]}
- JOURS : ${weekDays.join(', ')}
- FIN DU MOIS : ${endOfMonthStr} ← UTILISER CETTE DATE si "fin du mois" ou "fin de mois"
- DÉBUT MOIS PROCHAIN : ${startOfNextMonthStr} ← UTILISER CETTE DATE si "début du mois prochain"

⚠️ RÈGLE CRITIQUE : Si la pensée contient "fin du mois" ou "fin de mois", alors temporal_constraint.date = "${endOfMonthStr}"

${historyContext ? `HISTORIQUE : ${historyContext}\n` : ''}${memorySection}${RULES}
${EXAMPLES}
${JSON_FORMAT}`
}

// ============================================
// EXPORTS
// ============================================

export { ANALYSIS_SYSTEM as SYSTEM_PROMPT }
