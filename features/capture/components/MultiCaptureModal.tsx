'use client'

import { useState } from 'react'
import { CaptureModal, type ActionType } from './CaptureModal'
import type { ItemType, ItemContext } from '@/types/items'
import type { MultiThoughtItem } from '@/services/capture'

// ============================================
// TYPES
// ============================================

type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired'

interface MultiPensée extends MultiThoughtItem {
  saved?: boolean
  deleted?: boolean
}

interface MultiCaptureModalProps {
  items: MultiThoughtItem[]
  mood: Mood | null
  userId: string
  creditsRemaining?: number | null
  onSave: (index: number, type: ItemType, action: ActionType, context?: ItemContext) => Promise<void>
  onClose: () => void
}

// ============================================
// COMPOSANT
// ============================================

export function MultiCaptureModal({
  items,
  mood,
  userId,
  creditsRemaining,
  onSave,
  onClose
}: MultiCaptureModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pensées, setPensées] = useState<MultiPensée[]>(
    items.map(item => ({ ...item, saved: false, deleted: false }))
  )
  const [isSaving, setIsSaving] = useState(false)

  const currentPensée = pensées[currentIndex]
  const totalPensées = pensées.length
  const remainingPensées = pensées.filter(p => !p.saved && !p.deleted).length

  const handleSave = async (type: ItemType, action: ActionType, context?: ItemContext) => {
    if (isSaving) return
    setIsSaving(true)

    try {
      if (action === 'delete') {
        // Marquer comme supprimée
        const updated = [...pensées]
        updated[currentIndex].deleted = true
        setPensées(updated)

        // Passer à la suivante ou fermer
        goToNextOrClose()
        return
      }

      // Sauvegarder
      await onSave(currentIndex, type, action, context)

      // Marquer comme sauvegardée
      const updated = [...pensées]
      updated[currentIndex].saved = true
      setPensées(updated)

      // Passer à la suivante ou fermer
      goToNextOrClose()
    } catch (error) {
      console.error('Error saving pensée:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const goToNextOrClose = () => {
    // Chercher la prochaine pensée non traitée
    const nextIndex = pensées.findIndex((p, i) => i > currentIndex && !p.saved && !p.deleted)

    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex)
    } else {
      // Chercher avant l'index actuel
      const prevIndex = pensées.findIndex((p, i) => i < currentIndex && !p.saved && !p.deleted)

      if (prevIndex !== -1) {
        setCurrentIndex(prevIndex)
      } else {
        // Toutes les pensées sont traitées
        onClose()
      }
    }
  }

  const handlePrevious = () => {
    // Trouver la pensée précédente non traitée
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!pensées[i].saved && !pensées[i].deleted) {
        setCurrentIndex(i)
        return
      }
    }
    // Si pas trouvé, aller à la première non traitée
    const firstUntreated = pensées.findIndex(p => !p.saved && !p.deleted)
    if (firstUntreated !== -1 && firstUntreated !== currentIndex) {
      setCurrentIndex(firstUntreated)
    }
  }

  const handleNext = () => {
    // Trouver la pensée suivante non traitée
    for (let i = currentIndex + 1; i < totalPensées; i++) {
      if (!pensées[i].saved && !pensées[i].deleted) {
        setCurrentIndex(i)
        return
      }
    }
    // Si pas trouvé, aller à la dernière non traitée
    const lastUntreated = [...pensées].reverse().findIndex(p => !p.saved && !p.deleted)
    if (lastUntreated !== -1) {
      const actualIndex = totalPensées - 1 - lastUntreated
      if (actualIndex !== currentIndex) {
        setCurrentIndex(actualIndex)
      }
    }
  }

  // Vérifier si la pensée actuelle est déjà traitée (pour affichage)
  const isCurrentTreated = currentPensée.saved || currentPensée.deleted

  // Si toutes les pensées sont traitées, fermer
  if (remainingPensées === 0) {
    onClose()
    return null
  }

  // Si la pensée actuelle est traitée, aller à la suivante
  if (isCurrentTreated) {
    const nextUntreated = pensées.findIndex(p => !p.saved && !p.deleted)
    if (nextUntreated !== -1 && nextUntreated !== currentIndex) {
      setCurrentIndex(nextUntreated)
      return null
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container - positionné au-dessus du BottomNav */}
      <div className="fixed inset-x-0 bottom-20 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[75vh] overflow-hidden flex flex-col">

        {/* Header - Compteur de pensées */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-text-dark">
              Pensée {currentIndex + 1} sur {totalPensées}
            </h3>
            <p className="text-sm text-text-muted">
              {remainingPensées} restante{remainingPensées > 1 ? 's' : ''} à organiser
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={remainingPensées <= 1}
              className="p-2 rounded-lg border border-border hover:bg-gray-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Précédent"
            >
              <svg className="w-5 h-5 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              disabled={remainingPensées <= 1}
              className="p-2 rounded-lg border border-border hover:bg-gray-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Suivant"
            >
              <svg className="w-5 h-5 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Bouton fermer */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-light transition-all ml-2"
              title="Fermer"
            >
              <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Indicateurs de progression */}
        <div className="px-6 py-3 flex gap-1 shrink-0">
          {pensées.map((p, i) => (
            <div
              key={i}
              className={`
                h-1 flex-1 rounded-full transition-all
                ${p.saved ? 'bg-primary' : p.deleted ? 'bg-red-300' : i === currentIndex ? 'bg-primary/50' : 'bg-gray-light'}
              `}
            />
          ))}
        </div>

        {/* Contenu - Réutilise CaptureModal en mode embedded */}
        {/* key={currentIndex} force le remontage pour réinitialiser le type sélectionné */}
        <div className="p-6 overflow-y-auto flex-1">
          <CaptureModal
            key={currentIndex}
            content={currentPensée.content}
            captureResult={{
              success: true,
              aiUsed: true,
              suggestedType: currentPensée.type,
              aiAnalysis: currentPensée.ai_analysis,
              creditsRemaining
            }}
            mood={mood}
            userId={userId}
            onSave={handleSave}
            onClose={onClose}
            isEmbedded={true}
          />
        </div>

      </div>
    </>
  )
}
