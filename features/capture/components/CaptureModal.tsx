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
  isEmbedded?: boolean // Pour mode intégré dans MultiCaptureModal
}

export type ActionType = 'save' | 'plan' | 'develop' | 'add_to_list' | 'delete'

interface ActionButton {
  label: string
  value: ActionType
  requiresAI?: boolean
  variant?: 'primary' | 'secondary'
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

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
      { label: 'Enregistrer', value: 'save', variant: 'primary' },
      { label: 'Planifier', value: 'plan', variant: 'secondary', requiresAI: true }
    ]
  },
  note: {
    icon: <NoteIcon />,
    label: 'Note',
    actions: [
      { label: 'Ajouter', value: 'save', variant: 'primary' }
    ]
  },
  list_item: {
    icon: <ShoppingIcon />,
    label: 'Course',
    actions: [
      { label: 'Ajouter', value: 'add_to_list', variant: 'primary' }
    ]
  },
  idea: {
    icon: <IdeaIcon />,
    label: 'Idée',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'primary' },
      { label: 'Développer', value: 'develop', variant: 'secondary', requiresAI: true }
    ]
  }
}

// Suggestions intelligentes selon mood + contenu + type
function getMoodSuggestion(
  mood: Mood,
  content: string,
  type: ItemType
): string {
  if (type !== 'task') return ''

  const lowerContent = content.toLowerCase()
  const isUrgent = lowerContent.includes('urgent') || lowerContent.includes('aujourd\'hui') || lowerContent.includes('maintenant')
  const isQuick = lowerContent.includes('rapide') || lowerContent.includes('vite') || lowerContent.includes('appel')
  const isComplex = lowerContent.includes('projet') || lowerContent.includes('organiser') || lowerContent.includes('préparer')

  switch (mood) {
    case 'energetic':
      if (isComplex) return '💪 Super ! Tu as l\'énergie pour t\'attaquer à cette grosse tâche maintenant.'
      if (isQuick) return '💪 Parfait moment pour enchaîner plusieurs petites tâches rapidement !'
      return '💪 Profite de ton énergie pour avancer sur cette tâche !'

    case 'overwhelmed':
      if (isUrgent) return '⚠️ C\'est urgent, mais prends une grande respiration avant de commencer.'
      if (isComplex) return '⚠️ Cette tâche peut attendre. Concentre-toi d\'abord sur l\'essentiel.'
      return '⚠️ Tu es débordé(e). Cette tâche peut-elle être reportée ou déléguée ?'

    case 'tired':
      if (isQuick) return '😴 Fatigue détectée. Cette tâche rapide peut se faire demain matin à tête reposée.'
      if (isComplex) return '😴 Tu es fatigué(e). Planifie cette tâche pour demain quand tu seras en forme.'
      return '😴 Repose-toi. Cette tâche attendra bien jusqu\'à demain !'

    case 'calm':
      if (isComplex) return '☕ Parfait moment pour les tâches qui demandent réflexion et concentration.'
      return '☕ Tu es calme, idéal pour avancer sereinement sur cette tâche.'

    default:
      return ''
  }
}

// ============================================
// COMPOSANT
// ============================================

export function CaptureModal({
  content,
  captureResult,
  mood,
  onSave,
  onClose,
  isEmbedded = false
}: CaptureModalProps) {
  const hasAIQuota = !captureResult.quotaExceeded

  const [selectedType, setSelectedType] = useState<ItemType>(
    captureResult.suggestedType || 'task'
  )

  const config = TYPE_CONFIG[selectedType]

  // Contenu interne de la modal (réutilisable en mode embedded)
  const ModalContent = () => (
    <div className="space-y-4">
      {/* Indicateur IA */}
      {captureResult.aiUsed && captureResult.suggestedType && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-primary">IA suggère :</span>
          <span className="font-medium text-primary flex items-center gap-1">
            <span className="w-5 h-5">{TYPE_CONFIG[captureResult.suggestedType].icon}</span>
            {TYPE_CONFIG[captureResult.suggestedType].label}
          </span>
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
        </div>
      )}

      {/* Contenu capturé */}
      <div className="p-4 bg-mint rounded-xl border border-border">
        <p className="text-text-dark whitespace-pre-wrap">{content}</p>
      </div>

      {/* Suggestion selon mood */}
      {mood && selectedType === 'task' && getMoodSuggestion(mood, content, selectedType) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            {getMoodSuggestion(mood, content, selectedType)}
          </p>
        </div>
      )}

      {/* Types - Icônes seulement */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-dark">Type :</p>
        <div className="flex gap-2">
          {(Object.keys(TYPE_CONFIG) as ItemType[]).map((type) => {
            const typeConfig = TYPE_CONFIG[type]
            const isSelected = selectedType === type

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  flex items-center justify-center p-3 rounded-xl transition-all
                  ${isSelected
                    ? 'bg-primary text-white shadow-lg scale-105'
                    : 'bg-gray-light text-text-muted hover:bg-border'
                  }
                `}
                title={typeConfig.label}
              >
                {typeConfig.icon}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions - Une ligne horizontale */}
      <div className="flex gap-2">
        {config.actions.map((actionConfig) => {
          const isDisabled = actionConfig.requiresAI && !hasAIQuota

          return (
            <button
              key={actionConfig.value}
              onClick={() => !isDisabled && onSave(selectedType, actionConfig.value)}
              disabled={isDisabled}
              className={`
                flex-1 py-3 px-4 rounded-xl font-medium transition-all
                ${actionConfig.variant === 'primary'
                  ? 'bg-primary text-white hover:opacity-90'
                  : 'border-2 border-border text-text-dark hover:border-primary hover:text-primary'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-light border-gray-light' : ''}
              `}
            >
              {isDisabled && '🔒 '}
              {actionConfig.label}
            </button>
          )
        })}

        {/* Bouton Supprimer - Icône poubelle */}
        <button
          onClick={() => onSave(selectedType, 'delete')}
          className="p-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-all"
          title="Supprimer"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Bouton Annuler (seulement si pas embedded) */}
      {!isEmbedded && (
        <button
          onClick={onClose}
          className="w-full py-2 text-text-muted hover:text-text-dark font-medium"
        >
          Annuler
        </button>
      )}
    </div>
  )

  // Mode embedded : pas de backdrop ni wrapper
  if (isEmbedded) {
    return <ModalContent />
  }

  // Mode normal avec backdrop
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - positionné au-dessus du BottomNav (environ 80px de hauteur) */}
      <div className="fixed inset-x-0 bottom-20 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-w-2xl mx-auto mx-4">
        {/* Header avec crédits et bouton fermer */}
        <div className="flex items-center justify-end gap-3 px-6 pt-4">
          {captureResult.creditsRemaining !== null && captureResult.creditsRemaining !== undefined && (
            <span className="text-xs text-text-muted">
              {captureResult.creditsRemaining} crédits restants
            </span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-light transition-colors text-text-muted"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
          <ModalContent />
        </div>
      </div>
    </>
  )
}
