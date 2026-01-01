'use client'

import { useMemo } from 'react'
import type { TimeSlot } from '../types/scheduling.types'
import { CheckIcon } from '@/components/ui/icons'

// ============================================
// TYPES
// ============================================

interface TimeSlotCardProps {
  slot: TimeSlot
  rank?: 1 | 2 | 3  // Optionnel maintenant
  isSelected: boolean
  onSelect: () => void
}

const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉'
}

// ============================================
// HELPERS - Date stable pour le render
// ============================================

function getDateInfo(slotDate: string) {
  const date = new Date(slotDate)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  return { date, isToday, isTomorrow }
}

// ============================================
// COMPOSANT
// ============================================

export function TimeSlotCard({ slot, rank, isSelected, onSelect }: TimeSlotCardProps) {
  // Mémoiser le calcul de date pour éviter les appels impurs pendant le render
  const { date, isToday, isTomorrow } = useMemo(
    () => getDateInfo(slot.date),
    [slot.date]
  )

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
      {/* Header avec médaille/label, horaires et score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Médaille si rank, sinon label de diversification */}
          {rank ? (
            <span className="text-xl">{RANK_MEDALS[rank]}</span>
          ) : slot.label ? (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {slot.label}
            </span>
          ) : null}
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
            <CheckIcon className="w-[18px] h-[18px] text-primary" />
          )}
        </div>
      </div>
    </button>
  )
}
