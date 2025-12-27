'use client'

import type { TimeSlot } from '../types/scheduling.types'

// ============================================
// TYPES
// ============================================

interface TimeSlotCardProps {
  slot: TimeSlot
  rank: 1 | 2 | 3
  isSelected: boolean
  onSelect: () => void
}

const RANK_MEDALS = {
  1: '🥇',
  2: '🥈',
  3: '🥉'
}

// ============================================
// COMPOSANT
// ============================================

export function TimeSlotCard({ slot, rank, isSelected, onSelect }: TimeSlotCardProps) {
  // Formater la date en français
  const date = new Date(slot.date)
  const isToday = date.toDateString() === new Date().toDateString()
  const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString()

  let dateLabel: string
  if (isToday) {
    dateLabel = "Aujourd'hui"
  } else if (isTomorrow) {
    dateLabel = "Demain"
  } else {
    dateLabel = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    })
  }

  // Couleur du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-xl border-2 transition-all text-left
        hover:shadow-md active:scale-[0.98]
        ${isSelected
          ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50'
        }
      `}
    >
      {/* Header avec médaille et score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{RANK_MEDALS[rank]}</span>
          <div>
            <div className="font-semibold text-text-dark capitalize">
              {dateLabel}
            </div>
            <div className="text-base text-text-muted font-medium">
              {slot.startTime} → {slot.endTime}
            </div>
          </div>
        </div>

        <div className={`text-xs font-semibold px-2 py-1 rounded ${getScoreColor(slot.score)}`}>
          {slot.score}%
        </div>
      </div>

      {/* Raison */}
      <div className="text-xs text-text-muted flex items-start gap-1.5">
        <span>💡</span>
        <span className="flex-1">{slot.reason}</span>
      </div>

      {/* Indicateur sélection */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-primary/20">
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
              <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Créneau sélectionné</span>
          </div>
        </div>
      )}
    </button>
  )
}
