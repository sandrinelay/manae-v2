'use client'

import { useEffect } from 'react'

// ============================================
// TYPES
// ============================================

interface SuccessModalProps {
  taskContent: string
  scheduledDate: string  // Format: "Demain à 14h00"
  onClose: () => void
}

// ============================================
// COMPOSANT
// ============================================

export function SuccessModal({ taskContent, scheduledDate, onClose }: SuccessModalProps) {
  // Auto-fermer après 2 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 2000)

    return () => clearTimeout(timer)
  }, [onClose])

  console.log('[SuccessModal] Rendu avec:', { taskContent, scheduledDate })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-scale-in">
        {/* Icône animée */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              className="text-green-600"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-2xl font-bold text-center text-text-dark mb-2 font-quicksand">
          C'est calé !
        </h3>

        {/* Description */}
        <p className="text-center text-text-muted mb-1">
          <span className="font-medium text-text-dark">&quot;{taskContent}&quot;</span>
        </p>
        <p className="text-center text-sm text-text-muted">
          ajouté à ton calendrier {scheduledDate}
        </p>
      </div>
    </div>
  )
}

// ============================================
// HELPER - Formater la date pour l'affichage
// ============================================

export function formatScheduledDate(dateTimeString: string): string {
  const date = new Date(dateTimeString)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 86400000)

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (isToday) {
    return `aujourd'hui à ${timeStr}`
  } else if (isTomorrow) {
    return `demain à ${timeStr}`
  } else {
    const dayStr = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    return `${dayStr} à ${timeStr}`
  }
}
