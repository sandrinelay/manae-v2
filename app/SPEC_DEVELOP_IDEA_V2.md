# SPEC : Développement d'idées v2

## 📋 Contexte

### Application
**Manae** — App de productivité pour adultes mentalement surchargés. Capture de pensées, triage IA, planification intelligente.

### Cible utilisateur
Adultes avec une charge mentale élevée qui ont besoin de transformer leurs idées floues en projets concrets et actionnables.

### Feature à implémenter
Quand l'utilisateur clique sur "Développer" pour une idée, un **panel inline s'expand** (pas de navigation) avec :
1. Une question sur l'âge de l'idée (fraîche vs ancienne)
2. Si ancienne : des chips pour identifier les blocages
3. Appel IA qui adapte le prompt selon le contexte
4. Affichage du résultat avec les étapes générées
5. Navigation vers la page projet

---

## ✅ Décisions validées

| Aspect | Décision |
|--------|----------|
| Flow | Panel inline qui s'expand (pas de nouvelle page) |
| Questions | 1) Âge de l'idée, 2) Blocages si "ancienne" |
| Blocages | Chips prédéfinis : temps, budget, peur, énergie |
| State après dev | Automatique → `'project'` |
| Stockage étapes | Items enfants avec `parent_id` (type: task, state: active) |
| Stockage contexte | `metadata.development_context` |
| Actions post-dev | "Voir le projet" + "Fermer" |
| Page projet | Simple pour beta : liste des étapes avec checkbox |

---

## 🗂️ Fichiers à créer/modifier

```
À CRÉER :
├── features/ideas/types.ts
├── features/ideas/hooks/useIdeaDevelop.ts
├── features/ideas/components/IdeaDevelopPanel.tsx
└── app/projects/[id]/page.tsx

À MODIFIER :
├── app/api/develop-idea/route.ts
├── features/capture/components/CaptureModal.tsx
└── types/index.ts
```

---

## 📦 Ordre d'implémentation

1. `features/ideas/types.ts` — Types de base
2. `types/index.ts` — Re-export des nouveaux types
3. `features/ideas/hooks/useIdeaDevelop.ts` — Logique du flow
4. `features/ideas/components/IdeaDevelopPanel.tsx` — UI du panel
5. `app/api/develop-idea/route.ts` — Modifier l'API
6. `features/capture/components/CaptureModal.tsx` — Intégrer le panel
7. `app/projects/[id]/page.tsx` — Page projet

---

## 1️⃣ Types (`features/ideas/types.ts`)

```typescript
// ============================================
// TYPES - Développement d'idées
// ============================================

/**
 * Âge de l'idée
 */
export type IdeaAge = 'fresh' | 'old'

/**
 * Blocages possibles
 */
export type IdeaBlocker = 'time' | 'budget' | 'fear' | 'energy'

/**
 * Contexte de développement (stocké dans item.metadata)
 */
export interface DevelopmentContext {
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
  developed_at: string
}

/**
 * Configuration UI des blocages
 */
export const BLOCKER_CONFIG: Record<IdeaBlocker, { label: string; emoji: string }> = {
  time: { label: 'Temps', emoji: '⏰' },
  budget: { label: 'Budget', emoji: '💸' },
  fear: { label: 'Peur', emoji: '😰' },
  energy: { label: 'Énergie', emoji: '🔋' }
}

/**
 * Étapes du flow UI
 */
export type DevelopStep = 'age' | 'blockers' | 'loading' | 'result'

/**
 * Réponse de l'API develop-idea
 */
export interface DevelopIdeaResponse {
  project: {
    id: string
    content: string
    refined_title: string
    estimated_time: string
    budget: string | null
    motivation: string
  }
  steps: {
    id: string
    content: string
    order: number
  }[]
}

/**
 * Body de la requête API
 */
export interface DevelopIdeaRequest {
  itemId: string
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
}
```

---

## 2️⃣ Re-export (`types/index.ts`)

Ajouter à la fin du fichier existant :

```typescript
// ============================================
// IDEA DEVELOPMENT
// ============================================

export type { 
  IdeaAge, 
  IdeaBlocker, 
  DevelopmentContext,
  DevelopStep,
  DevelopIdeaResponse,
  DevelopIdeaRequest
} from '@/features/ideas/types'

export { BLOCKER_CONFIG } from '@/features/ideas/types'
```

---

## 3️⃣ Hook (`features/ideas/hooks/useIdeaDevelop.ts`)

```typescript
'use client'

import { useState, useCallback } from 'react'
import type { 
  IdeaAge, 
  IdeaBlocker, 
  DevelopStep, 
  DevelopIdeaResponse 
} from '../types'

// ============================================
// TYPES
// ============================================

interface UseIdeaDevelopOptions {
  itemId: string
  onSuccess?: (response: DevelopIdeaResponse) => void
  onError?: (error: Error) => void
}

interface UseIdeaDevelopReturn {
  // État
  currentStep: DevelopStep
  ideaAge: IdeaAge | null
  blockers: IdeaBlocker[]
  isLoading: boolean
  error: Error | null
  result: DevelopIdeaResponse | null
  
  // Actions
  setIdeaAge: (age: IdeaAge) => void
  toggleBlocker: (blocker: IdeaBlocker) => void
  develop: () => Promise<void>
  reset: () => void
}

// ============================================
// HOOK
// ============================================

export function useIdeaDevelop(options: UseIdeaDevelopOptions): UseIdeaDevelopReturn {
  const { itemId, onSuccess, onError } = options

  // État local
  const [currentStep, setCurrentStep] = useState<DevelopStep>('age')
  const [ideaAge, setIdeaAgeState] = useState<IdeaAge | null>(null)
  const [blockers, setBlockers] = useState<IdeaBlocker[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<DevelopIdeaResponse | null>(null)

  /**
   * Définir l'âge de l'idée et passer à l'étape suivante
   */
  const setIdeaAge = useCallback((age: IdeaAge) => {
    setIdeaAgeState(age)
    setCurrentStep('blockers')
  }, [])

  /**
   * Toggle un blocage (sélection multiple)
   */
  const toggleBlocker = useCallback((blocker: IdeaBlocker) => {
    setBlockers(prev => 
      prev.includes(blocker) 
        ? prev.filter(b => b !== blocker)
        : [...prev, blocker]
    )
  }, [])

  /**
   * Lancer le développement via API
   */
  const develop = useCallback(async () => {
    if (!ideaAge) return

    setIsLoading(true)
    setCurrentStep('loading')
    setError(null)

    try {
      const response = await fetch('/api/develop-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          idea_age: ideaAge,
          blockers: ideaAge === 'old' ? blockers : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du développement')
      }

      const data: DevelopIdeaResponse = await response.json()
      setResult(data)
      setCurrentStep('result')
      onSuccess?.(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue')
      setError(error)
      setCurrentStep('blockers')
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [itemId, ideaAge, blockers, onSuccess, onError])

  /**
   * Réinitialiser le flow
   */
  const reset = useCallback(() => {
    setCurrentStep('age')
    setIdeaAgeState(null)
    setBlockers([])
    setError(null)
    setResult(null)
  }, [])

  return {
    currentStep,
    ideaAge,
    blockers,
    isLoading,
    error,
    result,
    setIdeaAge,
    toggleBlocker,
    develop,
    reset
  }
}
```

---

## 4️⃣ Composant Panel (`features/ideas/components/IdeaDevelopPanel.tsx`)

```typescript
'use client'

import { useIdeaDevelop } from '../hooks/useIdeaDevelop'
import { BLOCKER_CONFIG } from '../types'
import type { IdeaBlocker } from '../types'

// ============================================
// TYPES
// ============================================

interface IdeaDevelopPanelProps {
  itemId: string
  itemContent: string
  onClose: () => void
  onDeveloped?: () => void
}

// ============================================
// COMPOSANT
// ============================================

export function IdeaDevelopPanel({ 
  itemId, 
  itemContent, 
  onClose, 
  onDeveloped 
}: IdeaDevelopPanelProps) {
  const {
    currentStep,
    ideaAge,
    blockers,
    isLoading,
    error,
    result,
    setIdeaAge,
    toggleBlocker,
    develop
  } = useIdeaDevelop({
    itemId,
    onSuccess: onDeveloped
  })

  // Peut-on lancer le développement ?
  const canDevelop = ideaAge !== null

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
      
      {/* ========================================
          ÉTAPE 1 : Âge de l'idée
          ======================================== */}
      {currentStep === 'age' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-dark">
            ✨ Cette idée...
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIdeaAge('fresh')}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-border 
                         hover:border-primary hover:bg-mint transition-all
                         text-sm font-medium text-text-dark"
            >
              🌱 Elle est toute fraîche
            </button>
            <button
              onClick={() => setIdeaAge('old')}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-border 
                         hover:border-primary hover:bg-mint transition-all
                         text-sm font-medium text-text-dark"
            >
              ⏸️ Elle traîne depuis un moment
            </button>
          </div>
        </div>
      )}

      {/* ========================================
          ÉTAPE 2 : Blocages (si old) + Bouton créer
          ======================================== */}
      {currentStep === 'blockers' && (
        <div className="space-y-4">
          {/* Récap du choix d'âge */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>✨ Cette idée...</span>
            <span className="px-2 py-1 bg-mint rounded-lg text-primary font-medium">
              {ideaAge === 'fresh' ? '🌱 Toute fraîche' : '⏸️ Depuis un moment'}
            </span>
            <button 
              onClick={() => {
                setIdeaAge(ideaAge === 'fresh' ? 'old' : 'fresh')
              }}
              className="text-xs text-text-muted hover:text-primary underline ml-auto"
            >
              Modifier
            </button>
          </div>

          {/* Chips blocages (seulement si idée ancienne) */}
          {ideaAge === 'old' && (
            <div className="space-y-2">
              <p className="text-sm text-text-muted">
                Qu'est-ce qui la freine ? <span className="opacity-60">(optionnel)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(BLOCKER_CONFIG) as [IdeaBlocker, typeof BLOCKER_CONFIG[IdeaBlocker]][]).map(
                  ([key, config]) => {
                    const isSelected = blockers.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => toggleBlocker(key)}
                        className={`
                          px-3 py-2 rounded-full text-sm font-medium transition-all
                          ${isSelected 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-light text-text-dark hover:bg-border'
                          }
                        `}
                      >
                        {config.emoji} {config.label}
                      </button>
                    )
                  }
                )}
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}

          {/* Bouton créer le projet */}
          <button
            onClick={develop}
            disabled={!canDevelop || isLoading}
            className="w-full py-3 px-4 bg-primary text-white rounded-xl 
                       font-medium hover:bg-primary-dark transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✨ Créer mon projet
          </button>
        </div>
      )}

      {/* ========================================
          ÉTAPE 3 : Loading
          ======================================== */}
      {currentStep === 'loading' && (
        <div className="py-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent 
                          rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-muted">
            Manae structure ton projet...
          </p>
        </div>
      )}

      {/* ========================================
          ÉTAPE 4 : Résultat
          ======================================== */}
      {currentStep === 'result' && result && (
        <div className="space-y-4">
          {/* Badge succès */}
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 
                          p-3 rounded-lg border border-green-200">
            <span>✅</span>
            <span>Projet créé avec {result.steps.length} étapes</span>
          </div>

          {/* Titre raffiné */}
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
              Projet
            </p>
            <p className="font-semibold text-text-dark text-lg">
              {result.project.refined_title}
            </p>
          </div>

          {/* Aperçu des étapes (max 3) */}
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">
              Étapes
            </p>
            <ul className="space-y-2">
              {result.steps.slice(0, 3).map((step, index) => (
                <li 
                  key={step.id} 
                  className="flex items-start gap-2 text-sm text-text-medium"
                >
                  <span className="w-5 h-5 rounded-full bg-gray-light text-text-muted 
                                   flex items-center justify-center text-xs flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{step.content}</span>
                </li>
              ))}
              {result.steps.length > 3 && (
                <li className="text-sm text-text-muted pl-7">
                  +{result.steps.length - 3} autres étapes...
                </li>
              )}
            </ul>
          </div>

          {/* Infos complémentaires */}
          <div className="flex flex-wrap gap-4 text-sm text-text-muted">
            {result.project.estimated_time && (
              <span className="flex items-center gap-1">
                <span>⏱️</span>
                <span>{result.project.estimated_time}</span>
              </span>
            )}
            {result.project.budget && (
              <span className="flex items-center gap-1">
                <span>💰</span>
                <span>{result.project.budget}</span>
              </span>
            )}
          </div>

          {/* Motivation */}
          {result.project.motivation && (
            <div className="bg-mint p-4 rounded-xl">
              <p className="text-sm text-primary italic">
                💬 "{result.project.motivation}"
              </p>
            </div>
          )}

          {/* Actions finales */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-border rounded-xl 
                         text-sm font-medium text-text-dark hover:bg-gray-light 
                         transition-colors"
            >
              Fermer
            </button>
            <a
              href={`/projects/${result.project.id}`}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-xl 
                         text-sm font-medium text-center hover:bg-primary-dark 
                         transition-colors"
            >
              Voir le projet →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 5️⃣ API modifiée (`app/api/develop-idea/route.ts`)

**REMPLACER ENTIÈREMENT** le fichier existant :

```typescript
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

type IdeaAge = 'fresh' | 'old'
type IdeaBlocker = 'time' | 'budget' | 'fear' | 'energy'

interface RequestBody {
  itemId: string
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
}

interface AIResponse {
  refined_title: string
  steps: string[]
  estimated_time: string
  budget: string | null
  motivation: string
}

interface DevelopmentContext {
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
  developed_at: string
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(ideaText: string, ideaAge: IdeaAge, blockers?: IdeaBlocker[]): string {
  let contextSection = ''

  if (ideaAge === 'fresh') {
    contextSection = `
CONTEXTE : Idée fraîche, capturée récemment.
OBJECTIF : Structurer en projet motivant et concret.
TON : Enthousiaste, encourageant, dynamique.
`
  } else {
    const blockerLabels: Record<IdeaBlocker, string> = {
      time: 'Manque de temps',
      budget: 'Budget limité',
      fear: 'Peur de mal faire / doutes',
      energy: "Manque d'énergie"
    }

    const blockersList = blockers?.length 
      ? blockers.map(b => blockerLabels[b]).join(', ')
      : 'Non précisé'

    contextSection = `
CONTEXTE : Idée qui existe depuis longtemps mais n'avance pas.
BLOCAGES IDENTIFIÉS : ${blockersList}
OBJECTIF : Débloquer et relancer cette idée.
TON : Rassurant, empathique, pas culpabilisant.

ADAPTATION DES ÉTAPES SELON LES BLOCAGES :
- Si blocage temps → Micro-étapes (5-15min max chacune)
- Si blocage budget → Étapes gratuites ou peu coûteuses en priorité
- Si blocage peur/doutes → Étapes de validation rapide, feedback tôt
- Si blocage énergie → Étapes légères, sans urgence
`
  }

  return `Tu es un coach en organisation pour adultes mentalement surchargés.

L'utilisateur a cette idée : "${ideaText}"

${contextSection}

TÂCHES :
1. Reformule l'idée en titre clair et engageant (max 60 caractères)
2. Décompose en 3-5 étapes concrètes et actionnables
3. Estime le temps total réaliste
4. Estime le budget si applicable (sinon null)
5. Ajoute une phrase de motivation encourageante

RÈGLES IMPORTANTES :
- Chaque étape DOIT commencer par un verbe d'action à l'infinitif
- Étapes adaptées à une personne avec une charge mentale élevée
- La 1ère étape DOIT être faisable en moins de 15 minutes
- Pas de jargon, langage simple et direct
- Budget en euros avec fourchette si applicable

Réponds UNIQUEMENT en JSON valide, sans markdown ni commentaires :
{
  "refined_title": "Titre clair du projet",
  "steps": [
    "Verbe + action concrète 1",
    "Verbe + action concrète 2",
    "Verbe + action concrète 3"
  ],
  "estimated_time": "Durée totale réaliste (ex: 3h sur 2 semaines)",
  "budget": "Fourchette en euros (ex: 50-100€) ou null",
  "motivation": "Phrase encourageante courte (max 100 caractères)"
}`
}

// ============================================
// API ROUTE
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier configuration OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'Service IA non configuré' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 2. Vérifier authentification
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 3. Parser le body
    const body: RequestBody = await request.json()
    const { itemId, idea_age, blockers } = body

    if (!itemId || !idea_age) {
      return NextResponse.json(
        { error: 'Paramètres manquants: itemId et idea_age requis' },
        { status: 400 }
      )
    }

    // Valider idea_age
    if (!['fresh', 'old'].includes(idea_age)) {
      return NextResponse.json(
        { error: 'idea_age doit être "fresh" ou "old"' },
        { status: 400 }
      )
    }

    // 4. Récupérer l'item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item non trouvé' }, { status: 404 })
    }

    if (item.type !== 'idea') {
      return NextResponse.json(
        { error: 'Cet item n\'est pas une idée' },
        { status: 400 }
      )
    }

    if (item.state === 'project') {
      return NextResponse.json(
        { error: 'Cette idée a déjà été développée' },
        { status: 400 }
      )
    }

    // 5. Construire et envoyer le prompt à OpenAI
    const prompt = buildPrompt(item.content, idea_age, blockers)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Tu es un coach en organisation. Tu réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1500
    })

    // 6. Parser la réponse IA
    const responseContent = completion.choices[0].message.content || ''
    const cleanContent = responseContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse: AIResponse
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanContent)
      return NextResponse.json(
        { error: 'Réponse IA invalide, veuillez réessayer' },
        { status: 500 }
      )
    }

    // Valider la réponse
    if (!aiResponse.refined_title || !aiResponse.steps || !Array.isArray(aiResponse.steps)) {
      console.error('Invalid AI response structure:', aiResponse)
      return NextResponse.json(
        { error: 'Structure de réponse IA invalide' },
        { status: 500 }
      )
    }

    // 7. Mettre à jour l'item parent (idée → projet)
    const developmentContext: DevelopmentContext = {
      idea_age,
      blockers: idea_age === 'old' ? blockers : undefined,
      developed_at: new Date().toISOString()
    }

    const updatedMetadata = {
      ...(item.metadata || {}),
      development_context: developmentContext,
      original_content: item.content,
      estimated_time: aiResponse.estimated_time,
      budget: aiResponse.budget,
      motivation: aiResponse.motivation
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({
        state: 'project',
        content: aiResponse.refined_title,
        metadata: updatedMetadata
      })
      .eq('id', itemId)

    if (updateError) {
      console.error('Failed to update item:', updateError)
      throw updateError
    }

    // 8. Créer les étapes comme items enfants (type: task)
    const stepsToInsert = aiResponse.steps.map((stepContent, index) => ({
      user_id: user.id,
      type: 'task' as const,
      state: 'active' as const,
      content: stepContent,
      context: item.context || 'personal',
      parent_id: itemId,
      metadata: { 
        step_order: index + 1,
        from_project: itemId
      }
    }))

    const { data: createdSteps, error: stepsError } = await supabase
      .from('items')
      .insert(stepsToInsert)
      .select('id, content')

    if (stepsError) {
      console.error('Failed to create steps:', stepsError)
      // Rollback : remettre l'item en état 'idea' si les étapes échouent
      await supabase
        .from('items')
        .update({ 
          state: 'idea',
          content: item.content,
          metadata: item.metadata
        })
        .eq('id', itemId)
      
      throw stepsError
    }

    // 9. Retourner le résultat
    return NextResponse.json({
      project: {
        id: itemId,
        content: item.content,
        refined_title: aiResponse.refined_title,
        estimated_time: aiResponse.estimated_time,
        budget: aiResponse.budget,
        motivation: aiResponse.motivation
      },
      steps: createdSteps?.map((step, index) => ({
        id: step.id,
        content: step.content,
        order: index + 1
      })) || []
    })

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Development error:', error)
    return NextResponse.json(
      { error: err.message || 'Erreur lors du développement de l\'idée' },
      { status: 500 }
    )
  }
}
```

---

## 6️⃣ Intégration dans CaptureModal

**MODIFIER** `features/capture/components/CaptureModal.tsx`

Ajouter ces modifications :

### 6.1 Imports (en haut du fichier)

```typescript
// Ajouter cet import
import { IdeaDevelopPanel } from '@/features/ideas/components/IdeaDevelopPanel'
```

### 6.2 État local (dans le composant)

```typescript
// Ajouter ces états
const [showDevelopPanel, setShowDevelopPanel] = useState(false)
const [savedItemId, setSavedItemId] = useState<string | null>(null)
```

### 6.3 Modifier le handler onSave pour les idées

Quand l'utilisateur clique sur "Développer" pour une idée, au lieu de naviguer, on doit :
1. Sauvegarder l'item d'abord (pour avoir l'ID)
2. Afficher le panel inline

```typescript
// Modifier la fonction onSave ou créer une fonction handleDevelop
const handleDevelop = async () => {
  try {
    // Sauvegarder l'idée d'abord si pas encore fait
    if (!savedItemId) {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'idea',
          state: 'active', // ou 'captured'
          content: content,
          mood: mood
        })
      })
      
      if (!response.ok) throw new Error('Failed to save item')
      
      const { item } = await response.json()
      setSavedItemId(item.id)
    }
    
    // Afficher le panel de développement
    setShowDevelopPanel(true)
  } catch (err) {
    console.error('Error preparing development:', err)
  }
}
```

### 6.4 Affichage conditionnel du panel

Ajouter dans le JSX, après les boutons d'action de l'idée :

```typescript
{/* Panel de développement d'idée */}
{selectedType === 'idea' && showDevelopPanel && savedItemId && (
  <IdeaDevelopPanel
    itemId={savedItemId}
    itemContent={content}
    onClose={() => {
      setShowDevelopPanel(false)
      onClose() // Fermer la modal principale aussi
    }}
    onDeveloped={() => {
      // Callback optionnel après développement réussi
      // Ex: rafraîchir la liste, afficher notification, etc.
    }}
  />
)}
```

### 6.5 Modifier le bouton "Développer"

Remplacer le comportement du bouton "Développer" pour les idées :

```typescript
// Dans TYPE_CONFIG, modifier l'action 'develop' pour les idées
// OU dans le onClick du bouton "Développer", appeler handleDevelop au lieu de onSave

<button
  onClick={handleDevelop}  // <-- Au lieu de () => onSave('idea', 'develop')
  disabled={!hasAIQuota}
  className="..."
>
  💡 Développer
</button>
```

---

## 7️⃣ Page Projet (`app/projects/[id]/page.tsx`)

**CRÉER** ce nouveau fichier :

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getItem, getItems, updateItem } from '@/services/supabase/items.service'
import type { Item, ItemState } from '@/types/items'

// ============================================
// TYPES
// ============================================

interface ProjectMetadata {
  original_content?: string
  estimated_time?: string
  budget?: string | null
  motivation?: string
  development_context?: {
    idea_age: 'fresh' | 'old'
    blockers?: string[]
    developed_at: string
  }
}

// ============================================
// COMPOSANT PAGE
// ============================================

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  // État
  const [project, setProject] = useState<Item | null>(null)
  const [steps, setSteps] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger le projet et ses étapes
  useEffect(() => {
    async function loadProject() {
      try {
        setIsLoading(true)
        setError(null)

        // Charger le projet
        const projectData = await getItem(projectId)
        
        if (!projectData) {
          setError('Projet non trouvé')
          return
        }

        if (projectData.state !== 'project') {
          setError('Cet item n\'est pas un projet')
          return
        }

        setProject(projectData)

        // Charger les étapes (items avec parent_id = projectId)
        const stepsData = await getItems({ parent_id: projectId })
        
        // Trier par step_order
        const sortedSteps = stepsData.sort((a, b) => {
          const orderA = (a.metadata as { step_order?: number })?.step_order || 0
          const orderB = (b.metadata as { step_order?: number })?.step_order || 0
          return orderA - orderB
        })

        setSteps(sortedSteps)
      } catch (err) {
        console.error('Failed to load project:', err)
        setError('Erreur lors du chargement du projet')
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      loadProject()
    }
  }, [projectId])

  // Toggle état d'une étape (active <-> completed)
  const toggleStepState = useCallback(async (step: Item) => {
    const newState: ItemState = step.state === 'completed' ? 'active' : 'completed'
    
    try {
      await updateItem(step.id, { state: newState })
      
      setSteps(prev => prev.map(s => 
        s.id === step.id ? { ...s, state: newState } : s
      ))
    } catch (err) {
      console.error('Failed to update step:', err)
    }
  }, [])

  // ========================================
  // RENDER : Loading
  // ========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent 
                          rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-muted">Chargement du projet...</p>
        </div>
      </div>
    )
  }

  // ========================================
  // RENDER : Error
  // ========================================
  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-text-muted">{error || 'Projet non trouvé'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
          >
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  // ========================================
  // RENDER : Project
  // ========================================
  const metadata = project.metadata as ProjectMetadata
  const completedCount = steps.filter(s => s.state === 'completed').length
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      {/* ======== HEADER ======== */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-text-muted hover:text-text-dark transition-colors mb-3 
                       flex items-center gap-1"
          >
            <span>←</span>
            <span>Retour</span>
          </button>
          
          <h1 className="text-xl font-bold text-text-dark leading-tight">
            {project.content}
          </h1>
          
          {metadata.original_content && metadata.original_content !== project.content && (
            <p className="text-sm text-text-muted mt-1">
              Idée originale : "{metadata.original_content}"
            </p>
          )}
        </div>
      </header>

      {/* ======== MAIN CONTENT ======== */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Barre de progression */}
        <div className="bg-white rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-dark">Progression</span>
            <span className="text-sm text-text-muted">
              {completedCount}/{steps.length} étapes
            </span>
          </div>
          <div className="h-2 bg-gray-light rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {completedCount === steps.length && steps.length > 0 && (
            <p className="text-sm text-green-600 mt-2 font-medium">
              🎉 Projet terminé !
            </p>
          )}
        </div>

        {/* Infos du projet */}
        {(metadata.estimated_time || metadata.budget) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {metadata.estimated_time && (
              <div className="flex items-center gap-2 text-text-muted bg-white 
                              px-3 py-2 rounded-lg border border-border">
                <span>⏱️</span>
                <span>{metadata.estimated_time}</span>
              </div>
            )}
            {metadata.budget && (
              <div className="flex items-center gap-2 text-text-muted bg-white 
                              px-3 py-2 rounded-lg border border-border">
                <span>💰</span>
                <span>{metadata.budget}</span>
              </div>
            )}
          </div>
        )}

        {/* Motivation */}
        {metadata.motivation && (
          <div className="bg-mint p-4 rounded-xl border border-primary/20">
            <p className="text-sm text-primary">
              💬 "{metadata.motivation}"
            </p>
          </div>
        )}

        {/* Liste des étapes */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide">
            Étapes du projet
          </h2>
          
          {steps.length === 0 ? (
            <p className="text-sm text-text-muted bg-white p-4 rounded-xl border border-border">
              Aucune étape pour ce projet.
            </p>
          ) : (
            <ul className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = step.state === 'completed'
                const stepOrder = (step.metadata as { step_order?: number })?.step_order || index + 1

                return (
                  <li
                    key={step.id}
                    className={`
                      bg-white rounded-xl p-4 border border-border
                      transition-all duration-200
                      ${isCompleted ? 'opacity-70' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleStepState(step)}
                        className={`
                          w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5
                          flex items-center justify-center transition-all
                          ${isCompleted 
                            ? 'bg-primary border-primary text-white' 
                            : 'border-border hover:border-primary'
                          }
                        `}
                        aria-label={isCompleted ? 'Marquer comme non fait' : 'Marquer comme fait'}
                      >
                        {isCompleted && (
                          <svg 
                            className="w-3 h-3" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={3} 
                              d="M5 13l4 4L19 7" 
                            />
                          </svg>
                        )}
                      </button>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <p className={`
                          text-text-dark leading-relaxed
                          ${isCompleted ? 'line-through text-text-muted' : ''}
                        `}>
                          {step.content}
                        </p>
                        <span className="text-xs text-text-muted mt-1 block">
                          Étape {stepOrder}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </main>
    </div>
  )
}
```

---

## 🧪 Tests à effectuer

Après implémentation, vérifier :

1. **Flow complet idée fraîche**
   - Capturer une idée
   - Cliquer "Développer"
   - Sélectionner "Toute fraîche"
   - Cliquer "Créer mon projet"
   - Vérifier : projet créé, étapes visibles, navigation fonctionne

2. **Flow complet idée ancienne**
   - Capturer une idée
   - Cliquer "Développer"
   - Sélectionner "Depuis un moment"
   - Sélectionner 1-2 blocages
   - Cliquer "Créer mon projet"
   - Vérifier : prompt adapté, étapes pertinentes

3. **Page projet**
   - Vérifier affichage des infos
   - Cocher/décocher des étapes
   - Vérifier la barre de progression

4. **Cas d'erreur**
   - Tester sans connexion API
   - Tester avec quota épuisé
   - Vérifier les messages d'erreur

---

## 📁 Structure finale

```
features/
└── ideas/
    ├── types.ts
    ├── hooks/
    │   └── useIdeaDevelop.ts
    └── components/
        └── IdeaDevelopPanel.tsx

app/
├── api/
│   └── develop-idea/
│       └── route.ts (modifié)
└── projects/
    └── [id]/
        └── page.tsx (nouveau)
```

---

## ⚠️ Points d'attention

1. **Quota IA** : L'opération `develop_idea` coûte 2 crédits. Vérifier que le système de quota existant est bien appelé.

2. **Rollback** : Si la création des étapes échoue, l'API remet l'item en état `idea`. Tester ce cas.

3. **Parent_id** : S'assurer que `getItems({ parent_id })` fonctionne correctement dans le service existant.

4. **Animation** : La classe `animate-fade-in` doit exister dans Tailwind. Sinon, l'ajouter ou la remplacer par une classe existante.
