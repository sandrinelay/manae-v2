'use client'

import { useState } from 'react'
import type { ItemType } from '@/types/items'
import type { CaptureResult } from '@/services/capture'

// ============================================
// TYPES
// ============================================

interface CaptureModalProps {
  content: string
  captureResult: CaptureResult
  onSave: (type: ItemType, action: ActionType) => void
  onClose: () => void
}

type ActionType = 'save' | 'plan' | 'develop' | 'add_to_list' | 'delete'

interface ActionButton {
  label: string
  value: ActionType
  requiresAI?: boolean
  variant?: 'primary' | 'danger'
  state?: string // État qui sera appliqué à l'item
}

// ============================================
// CONFIGURATION DES TYPES & ACTIONS
// ============================================

const TYPE_CONFIG: Record<ItemType, {
  icon: string
  label: string
  actions: ActionButton[]
}> = {
  task: {
    icon: '📅',
    label: 'Tâche',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'primary', state: 'active' },
      { label: 'Planifier', value: 'plan', variant: 'primary', requiresAI: true, state: 'planned' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  },
  note: {
    icon: '📝',
    label: 'Note',
    actions: [
      { label: 'Ajouter à mes notes', value: 'save', variant: 'primary', state: 'active' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  },
  list_item: {
    icon: '🛒',
    label: 'Course',
    actions: [
      { label: 'Ajouter à la liste', value: 'add_to_list', variant: 'primary', state: 'active' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  },
  idea: {
    icon: '💡',
    label: 'Idée',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'primary', state: 'active' },
      { label: 'Développer', value: 'develop', variant: 'primary', requiresAI: true, state: 'project' },
      { label: 'Supprimer', value: 'delete', variant: 'danger' }
    ]
  }
}

// ============================================
// COMPOSANT
// ============================================

export function CaptureModal({
  content,
  captureResult,
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
        <div className="p-6 space-y-6">

          {/* Indicateur IA */}
          {captureResult.aiUsed && captureResult.suggestedType && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-teal-600">IA suggère :</span>
              <span className="font-medium text-teal-600">
                {TYPE_CONFIG[captureResult.suggestedType].icon}{' '}
                {TYPE_CONFIG[captureResult.suggestedType].label}
              </span>
              {captureResult.creditsRemaining !== null && (
                <span className="ml-auto text-slate-500">
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
                className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
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
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-slate-800 whitespace-pre-wrap">{content}</p>
          </div>

          {/* Sélecteur de type */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">
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
                        ? 'bg-teal-500 text-white shadow-lg scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }
                    `}
                  >
                    <span className="text-2xl">{typeConfig.icon}</span>
                    <span className="text-xs">{typeConfig.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {config.actions.map((action) => {
              const isDisabled = action.requiresAI && !hasAIQuota

              return (
                <button
                  key={action.value}
                  onClick={() => !isDisabled && onSave(selectedType, action.value)}
                  disabled={isDisabled}
                  className={`
                    flex-1 py-3 px-4 rounded-xl font-medium transition-all
                    ${action.variant === 'danger'
                      ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
                      : isDisabled
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-teal-500 text-white hover:bg-teal-600 active:scale-95'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {action.label}
                  {isDisabled && ' 🔒'}
                </button>
              )
            })}
          </div>

          {/* Bouton Annuler */}
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium"
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  )
}

export type { ActionType }
