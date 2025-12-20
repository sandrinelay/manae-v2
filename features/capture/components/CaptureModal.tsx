'use client'

import { useState, type ReactNode } from 'react'
import type { ItemType } from '@/types/items'
import type { CaptureResult } from '@/services/capture'

// ============================================
// TYPES
// ============================================

type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired'

interface CaptureModalProps {
  content: string
  captureResult: CaptureResult
  mood: Mood | null
  onSave: (type: ItemType, action: ActionType) => void
  onClose: () => void
}

type ActionType = 'save' | 'plan' | 'develop' | 'add_to_list' | 'delete'

interface ActionButton {
  label: string
  value: ActionType
  requiresAI?: boolean
  variant?: 'primary' | 'danger'
  state?: string
}

// ============================================
// ICÔNES SVG MINIMALISTES
// ============================================

const TaskIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const NoteIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const ShoppingIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const IdeaIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

// ============================================
// CONFIGURATION DES TYPES & ACTIONS
// ============================================

const TYPE_CONFIG: Record<ItemType, {
  icon: ReactNode
  label: string
  actions: ActionButton[]
}> = {
  task: {
    icon: <TaskIcon />,
    label: 'Tâche',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'primary', state: 'active' },
      { label: 'Planifier', value: 'plan', variant: 'primary', requiresAI: true, state: 'planned' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  },
  note: {
    icon: <NoteIcon />,
    label: 'Note',
    actions: [
      { label: 'Ajouter à mes notes', value: 'save', variant: 'primary', state: 'active' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  },
  list_item: {
    icon: <ShoppingIcon />,
    label: 'Course',
    actions: [
      { label: 'Ajouter à la liste', value: 'add_to_list', variant: 'primary', state: 'active' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  },
  idea: {
    icon: <IdeaIcon />,
    label: 'Idée',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'primary', state: 'active' },
      { label: 'Développer', value: 'develop', variant: 'primary', requiresAI: true, state: 'project' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  }
}

// Suggestions selon le mood
const MOOD_SUGGESTIONS: Record<Mood, string> = {
  energetic: 'Parfait moment pour faire ça maintenant !',
  overwhelmed: 'Cette tâche peut attendre, concentre-toi sur l\'essentiel',
  tired: 'On la planifie pour demain quand tu seras en forme ?',
  calm: 'Bon moment pour les tâches qui demandent de la réflexion'
}

const MOOD_ICONS: Record<Mood, string> = {
  energetic: '💪',
  overwhelmed: '⚠️',
  tired: '😴',
  calm: '☕'
}

// ============================================
// COMPOSANT
// ============================================

export function CaptureModal({
  content,
  captureResult,
  mood,
  onSave,
  onClose
}: CaptureModalProps) {
  // État : type sélectionné (suggéré par IA ou task par défaut)
  const [selectedType, setSelectedType] = useState<ItemType>(
    captureResult.suggestedType || 'task'
  )

  // Configuration du type sélectionné
  const config = TYPE_CONFIG[selectedType]
  const hasAIQuota = !captureResult.quotaExceeded

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-w-2xl mx-auto">
        <div className="p-6 space-y-4">

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-light transition-colors text-text-muted"
          >
            ✕
          </button>

          {/* Indicateur IA */}
          {captureResult.aiUsed && captureResult.suggestedType && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-primary">IA suggère :</span>
              <span className="font-medium text-primary flex items-center gap-1">
                <span className="w-5 h-5">{TYPE_CONFIG[captureResult.suggestedType].icon}</span>
                {TYPE_CONFIG[captureResult.suggestedType].label}
              </span>
              {captureResult.creditsRemaining !== null && (
                <span className="ml-auto text-text-muted">
                  {captureResult.creditsRemaining} crédits restants
                </span>
              )}
            </div>
          )}

          {/* Alerte quota épuisé */}
          {captureResult.quotaExceeded && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium mb-2">
                Quota IA épuisé
              </p>
              <p className="text-sm text-amber-700">
                Veuillez catégoriser manuellement. Les fonctions IA (Planifier, Développer) sont désactivées.
              </p>
              <button
                className="mt-3 text-sm font-medium text-primary hover:opacity-80"
                onClick={() => {
                  // TODO: Router vers page upgrade
                  console.log('Navigate to upgrade page')
                }}
              >
                Passer à Plus (IA illimitée) →
              </button>
            </div>
          )}

          {/* Contenu capturé */}
          <div className="p-4 bg-mint rounded-lg border border-border">
            <p className="text-text-dark whitespace-pre-wrap">{content}</p>
          </div>

          {/* Durée estimée (pour tasks) */}
          {selectedType === 'task' && (
            <div className="text-sm text-text-muted">
              <span className="font-medium">⏱️ Durée estimée :</span> ~15 min
            </div>
          )}

          {/* Suggestion selon mood */}
          {mood && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                {MOOD_ICONS[mood]} {MOOD_SUGGESTIONS[mood]}
              </p>
            </div>
          )}

          {/* Sélecteur de type */}
          <div>
            <p className="text-sm font-medium text-text-dark mb-3">
              Type :
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(TYPE_CONFIG) as ItemType[]).map((type) => {
                const typeConfig = TYPE_CONFIG[type]
                const isSelected = selectedType === type

                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`
                      flex flex-col items-center gap-2 py-3 px-2 rounded-xl font-medium transition-all
                      ${isSelected
                        ? 'bg-primary text-white shadow-lg scale-105'
                        : 'bg-gray-light text-text-dark hover:bg-border'
                      }
                    `}
                  >
                    <div className={isSelected ? 'text-white' : 'text-text-muted'}>
                      {typeConfig.icon}
                    </div>
                    <span className="text-xs">{typeConfig.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {config.actions.map((action) => {
              const isDisabled = action.requiresAI && !hasAIQuota

              return (
                <button
                  key={action.value}
                  onClick={() => !isDisabled && onSave(selectedType, action.value)}
                  disabled={isDisabled}
                  className={`
                    flex-1 min-w-[100px] py-3 px-4 rounded-xl font-medium transition-all
                    ${action.variant === 'danger'
                      ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
                      : isDisabled
                        ? 'bg-gray-light text-text-muted cursor-not-allowed'
                        : 'bg-primary text-white hover:opacity-90 active:scale-95'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {action.label}
                  {isDisabled && ' 🔒'}
                </button>
              )
            })}

            {/* Bouton Déléguer (grisé) */}
            <button
              disabled
              className="flex-1 min-w-[100px] py-3 px-4 rounded-xl font-medium bg-gray-light text-text-muted cursor-not-allowed relative group"
            >
              Déléguer 👥
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-text-dark text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Disponible avec le forfait Famille
              </span>
            </button>
          </div>

          {/* Bouton Annuler */}
          <button
            onClick={onClose}
            className="w-full py-2 text-text-muted hover:text-text-dark font-medium"
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  )
}

export type { ActionType }
