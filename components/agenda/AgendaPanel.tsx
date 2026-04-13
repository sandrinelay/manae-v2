'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CalendarOff } from 'lucide-react'
import { AgendaEvent } from './AgendaEvent'
import type { AgendaDay } from '@/hooks/useAgenda'

interface AgendaPanelProps {
  isOpen: boolean
  days: AgendaDay[]
  isLoadingGcal: boolean
  gcalError: string | null
  isGcalConnected: boolean
  onClose: () => void
}

export function AgendaPanel({
  isOpen,
  days,
  isLoadingGcal,
  gcalError,
  isGcalConnected,
  onClose,
}: AgendaPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // isVisible gère le montage/démontage, isClosing joue l'animation inverse
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Ouverture : monter puis animer
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setIsVisible(true)
    } else if (isVisible) {
      // Fermeture : animer puis démonter
      setIsClosing(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsClosing(false)
      }, 220)
      return () => clearTimeout(timer)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture swipe vers le haut
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    let startY = 0
    const handleTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const handleTouchEnd = (e: TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - startY
      if (deltaY < -60) onClose()
    }

    panel.addEventListener('touchstart', handleTouchStart)
    panel.addEventListener('touchend', handleTouchEnd)
    return () => {
      panel.removeEventListener('touchstart', handleTouchStart)
      panel.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onClose])

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    document.body.style.overflow = isVisible ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop — fade in/out synchronisé */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-220"
        style={{ opacity: isClosing ? 0 : 1 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — positionné sous le header (60px) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Agenda — 7 jours"
        className={`fixed inset-x-0 z-50 bg-white rounded-b-3xl shadow-2xl flex flex-col ${
          isClosing ? 'animate-unroll-up' : 'animate-unroll-down'
        }`}
        style={{ top: '60px', maxHeight: 'calc(70vh - 60px)' }}
      >

        {/* Bandeaux d'état GCal */}
        {!isGcalConnected && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 shrink-0">
            <p className="text-xs text-blue-600 flex items-center gap-1.5">
              <CalendarOff className="w-3.5 h-3.5 shrink-0" />
              Connectez Google Calendar pour voir vos événements
            </p>
          </div>
        )}
        {gcalError && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {gcalError}
            </p>
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {days.map((day, index) => (
            <div key={index} className="mb-4">
              {/* Label du jour */}
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1 pt-2 capitalize">
                {day.label}
              </h3>

              <div className="border-l-2 border-gray-100 pl-3">
                {/* Skeleton GCal si chargement */}
                {isLoadingGcal && day.events.filter(e => e.source === 'gcal').length === 0 && (
                  <div className="flex gap-3 py-2 animate-pulse">
                    <div className="w-10 h-3 bg-gray-200 rounded" />
                    <div className="flex-1 h-3 bg-gray-200 rounded" />
                  </div>
                )}

                {/* Événements du jour */}
                {day.events.length > 0 ? (
                  day.events.map(event => (
                    <AgendaEvent key={event.id} event={event} />
                  ))
                ) : (
                  !isLoadingGcal && (
                    <p className="text-xs text-text-muted py-2 italic">Rien de prévu</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
