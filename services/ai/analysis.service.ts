/**
 * Service d'analyse IA des pensées capturées
 * Utilise les prompts centralisés dans /prompts
 */

import type {
  AIAnalyzedItem,
  AIAnalysisResult
} from '@/types/items'
import {
  cleanShoppingItemContent,
  detectShoppingCategory
} from '@/config/shopping-categories'
import {
  ANALYZE_CONFIG,
  buildAnalyzePrompt,
  SYSTEM_PROMPT as PROMPTS_SYSTEM
} from '@/prompts'
import type { AnalysisResponseAPI } from '@/prompts'

// ============================================
// RE-EXPORTS POUR COMPATIBILITÉ
// ============================================

export const SYSTEM_PROMPT = PROMPTS_SYSTEM
export type OpenAIAnalysisResponse = AnalysisResponseAPI

/**
 * Construit le prompt d'analyse (wrapper pour compatibilité)
 */
export function buildAnalysisPrompt(rawText: string, historyContext?: string): string {
  return buildAnalyzePrompt({
    rawText,
    today: new Date(),
    historyContext
  })
}

// ============================================
// ANALYSE IA (via API route)
// ============================================

export async function analyzeCapture(rawText: string): Promise<AIAnalysisResult> {
  const response = await fetch('/api/analyze-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Analysis failed')
  }

  return response.json()
}

// ============================================
// ANALYSE FALLBACK (règles basiques sans IA)
// ============================================

export function analyzeWithRules(rawText: string): AIAnalysisResult {
  const lowerText = rawText.toLowerCase().trim()
  const items: AIAnalyzedItem[] = []

  // Détection courses - mots-clés ou pattern "mot mot mot" courts
  const groceryKeywords = ['acheter', 'courses', 'supermarché', 'magasin']
  const commonGroceryItems = ['lait', 'pain', 'œufs', 'oeufs', 'beurre', 'fromage', 'eau', 'café', 'thé', 'sucre', 'sel', 'huile', 'pâtes', 'riz', 'viande', 'poulet', 'légumes', 'fruits', 'yaourt', 'jambon']

  const isGroceryContext = groceryKeywords.some(kw => lowerText.includes(kw))
  const words = rawText.split(/[\s,]+/).filter(w => w.length > 1)
  const groceryWordsFound = words.filter(w =>
    commonGroceryItems.includes(w.toLowerCase())
  )

  // Si plusieurs mots de courses détectés ou contexte courses explicite
  if (groceryWordsFound.length >= 2 || (isGroceryContext && groceryWordsFound.length >= 1)) {
    // Découper en list_items
    const itemsToAdd = groceryWordsFound.length > 0 ? groceryWordsFound : words.slice(0, 5)

    for (const item of itemsToAdd) {
      // Nettoyer et détecter la catégorie
      const cleanedContent = cleanShoppingItemContent(item)
      const category = detectShoppingCategory(item)

      items.push({
        content: cleanedContent,
        type: 'list_item',
        state: 'active',
        context: 'family',
        ai_analysis: {
          type_suggestion: 'list_item',
          confidence: 0.7,
          extracted_data: { items: [item], category },
          suggestions: ['Ajouter à la liste de courses']
        }
      })
    }

    return { items, raw_input: rawText }
  }

  // Cas spécial : "acheter du X" → nettoyer et créer un list_item
  if (isGroceryContext) {
    const cleanedContent = cleanShoppingItemContent(rawText)
    const category = detectShoppingCategory(cleanedContent)

    items.push({
      content: cleanedContent,
      type: 'list_item',
      state: 'active',
      context: 'family',
      ai_analysis: {
        type_suggestion: 'list_item',
        confidence: 0.7,
        extracted_data: { category },
        suggestions: ['Ajouter à la liste de courses']
      }
    })

    return { items, raw_input: rawText }
  }

  // Détection note (info à retenir)
  const notePatterns = [
    /aime/i, /adore/i, /déteste/i, /allergique/i,
    /code/i, /mot de passe/i, /numéro/i, /adresse/i,
    /anniversaire/i, /né le/i
  ]

  if (notePatterns.some(p => p.test(lowerText))) {
    items.push({
      content: rawText,
      type: 'note',
      state: 'active',
      context: 'family',
      ai_analysis: {
        type_suggestion: 'note',
        confidence: 0.8,
        extracted_data: {},
        suggestions: ['Information enregistrée']
      }
    })

    return { items, raw_input: rawText }
  }

  // Détection idée (projet futur)
  const ideaPatterns = [
    /envie de/i, /j'aimerais/i, /on pourrait/i, /ce serait bien de/i,
    /un jour/i, /plus tard/i, /projet/i, /rêve de/i,
    /en 202[5-9]/i, /l'année prochaine/i, /cet été/i, /ces vacances/i
  ]

  if (ideaPatterns.some(p => p.test(lowerText))) {
    items.push({
      content: rawText,
      type: 'idea',
      state: 'captured',
      context: 'personal',
      ai_analysis: {
        type_suggestion: 'idea',
        confidence: 0.7,
        extracted_data: {},
        suggestions: ['Cette idée peut être développée en projet']
      }
    })

    return { items, raw_input: rawText }
  }

  // Détection task par verbes d'action
  const actionVerbs = [
    /^appeler/i, /^téléphoner/i, /^contacter/i,
    /^prendre rdv/i, /^réserver/i, /^commander/i,
    /^envoyer/i, /^écrire/i, /^faire/i,
    /^aller/i, /^passer/i, /^chercher/i,
    /^rappeler/i, /^relancer/i
  ]

  if (actionVerbs.some(p => p.test(lowerText))) {
    items.push({
      content: rawText,
      type: 'task',
      state: 'active',
      context: 'personal',
      ai_analysis: {
        type_suggestion: 'task',
        confidence: 0.8,
        extracted_data: {},
        suggestions: ['Tâche prête à être planifiée']
      }
    })

    return { items, raw_input: rawText }
  }

  // Découpage par virgules/points si plusieurs segments
  const segments = rawText
    .split(/[,;]|\.(?!\d)/)
    .map(s => s.trim())
    .filter(s => s.length > 3)

  if (segments.length > 1) {
    for (const segment of segments) {
      items.push({
        content: segment,
        type: 'task',
        state: 'captured',
        context: 'personal',
        ai_analysis: {
          type_suggestion: 'task',
          confidence: 0.5,
          extracted_data: {},
          suggestions: ['À clarifier']
        }
      })
    }

    return { items, raw_input: rawText }
  }

  // Fallback : task captured
  items.push({
    content: rawText,
    type: 'task',
    state: 'captured',
    context: 'personal',
    ai_analysis: {
      type_suggestion: 'task',
      confidence: 0.4,
      extracted_data: {},
      suggestions: ['Type à confirmer']
    }
  })

  return { items, raw_input: rawText }
}

// ============================================
// EXPORT CONFIG POUR USAGE EXTERNE
// ============================================

export { ANALYZE_CONFIG }
