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
        w-full p-3 rounded-xl border-2 transition-all text-left
        hover:shadow-md active:scale-[0.98]
        ${isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50'
        }
      `}
    >
      {/* Header avec médaille, horaires et score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{RANK_MEDALS[rank]}</span>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-text-dark capitalize">
              {dateLabel}
            </span>
            <span className="text-sm text-text-muted">
              {slot.startTime} - {slot.endTime}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`text-xs font-semibold px-2 py-0.5 rounded ${getScoreColor(slot.score)}`}>
            {slot.score}%
          </div>
          {isSelected && (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-primary">
              <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}
