'use client'

import { useEffect, useState } from 'react'
import { useScheduling } from '@/features/schedule/hooks/useScheduling'
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendarStatus'
import { DurationSelector } from '@/features/schedule/components/DurationSelector'
import { TimeSlotCard } from '@/features/schedule/components/TimeSlotCard'
import { SuccessModal, formatScheduledDate } from '@/features/schedule/components/SuccessModal'
import GoogleCalendarCTA from '@/components/capture/GoogleCalendarCTA'
import {
  XIcon,
  ShoppingIcon
} from '@/components/ui/icons'
import { ActionButton } from '@/components/ui/ActionButton'

interface PlanShoppingModalProps {
  itemCount: number
  onClose: () => void
  onSuccess: () => void
}

export function PlanShoppingModal({ itemCount, onClose, onSuccess }: PlanShoppingModalProps) {
  const { isConnected: isCalendarConnected } = useGoogleCalendarStatus()
  const [showSuccess, setShowSuccess] = useState(false)

  // Hook de planification - on utilise un contenu générique pour les courses
  // skipItemUpdate: true car il n'y a pas d'item à mettre à jour, juste un événement calendar
  const scheduling = useScheduling({
    itemId: 'shopping-trip',
    taskContent: `Faire les courses (${itemCount} articles)`,
    mood: undefined,
    temporalConstraint: null,
    skipItemUpdate: true
  })

  // Charger les créneaux au montage si calendrier connecté
  useEffect(() => {
    if (isCalendarConnected) {
      scheduling.loadSlots()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalendarConnected])

  // Gérer la planification
  const handleSchedule = async () => {
    if (!scheduling.selectedSlot) return

    try {
      const success = await scheduling.scheduleTask()
      if (success) {
        setShowSuccess(true)
      }
    } catch (error) {
      console.error('Erreur planification:', error)
    }
  }

  // Fermer après succès
  const handleSuccessClose = () => {
    setShowSuccess(false)
    onSuccess()
    onClose()
  }

  // Connexion Google Calendar
  const handleConnectCalendar = () => {
    const planningContext = {
      itemId: 'shopping-trip',
      content: `Faire les courses (${itemCount} articles)`,
      returnTo: 'clarte-shopping'
    }
    localStorage.setItem('manae_pending_planning', JSON.stringify(planningContext))
    window.location.href = '/profil?connectCalendar=true'
  }

  // Modal de succès
  if (showSuccess && scheduling.selectedSlot) {
    const dateTimeString = `${scheduling.selectedSlot.date}T${scheduling.selectedSlot.startTime}:00`
    return (
      <SuccessModal
        taskContent={`Faire les courses (${itemCount} articles)`}
        scheduledDate={formatScheduledDate(dateTimeString)}
        onClose={handleSuccessClose}
      />
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - collé à la BottomNav */}
      <div className="fixed z-[60] inset-x-0 rounded-t-3xl bg-white shadow-2xl animate-slide-up flex flex-col" style={{ bottom: 'calc(95px + env(safe-area-inset-bottom, 0px))', maxHeight: 'calc(100vh - 155px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-2 text-primary">
            <ShoppingIcon className="w-5 h-5" />
            <span className="font-medium">Caler les courses</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-6">
            {/* Résumé courses */}
            <div className="p-4 bg-mint rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ShoppingIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text-dark">Faire les courses</p>
                  <p className="text-sm text-text-muted">{itemCount} article{itemCount > 1 ? 's' : ''} à acheter</p>
                </div>
              </div>
            </div>

            {/* Durée estimée - par défaut 60 min pour les courses */}
            <DurationSelector
              value={scheduling.estimatedDuration}
              onChange={(duration) => scheduling.setDuration(duration as 15 | 30 | 60)}
              disabled={scheduling.isLoading}
            />

            <div className="border-t border-border pt-6">
              {/* Google Calendar non connecté */}
              {(!isCalendarConnected || scheduling.error === 'calendar_session_expired' || scheduling.error === 'calendar_not_connected') && (
                <div className="space-y-4">
                  {scheduling.error === 'calendar_session_expired' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-orange-800 text-sm text-center">
                        Ta session Google Calendar a expiré
                      </p>
                    </div>
                  )}
                  <GoogleCalendarCTA
                    onConnect={handleConnectCalendar}
                    isConnecting={false}
                  />
                </div>
              )}

              {/* Chargement */}
              {isCalendarConnected && scheduling.isLoading && !scheduling.error && (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-text-muted">
                    Recherche des meilleurs créneaux...
                  </p>
                </div>
              )}

              {/* Erreur réseau */}
              {scheduling.error === 'network_error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
                  <div className="text-2xl mb-2">📡</div>
                  <p className="text-red-800 font-medium">Problème de connexion</p>
                  <p className="text-red-600 text-sm mt-1">
                    Vérifie ta connexion internet et réessaye.
                  </p>
                  <button
                    onClick={() => scheduling.loadSlots()}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {/* Erreur (autres) */}
              {scheduling.error && !['network_error', 'calendar_not_connected', 'calendar_session_expired', 'service_closed'].includes(scheduling.error) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-800 text-sm">{scheduling.error}</p>
                </div>
              )}

              {/* Créneaux */}
              {isCalendarConnected && !scheduling.isLoading && scheduling.bestSlot && !scheduling.error && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-dark mb-3">
                    {scheduling.showAlternatives ? 'Créneaux suggérés' : 'Meilleur moment suggéré'}
                  </h3>

                  {/* Message d'explication contextuel */}
                  {scheduling.explanation && (
                    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-text-dark">{scheduling.explanation}</p>
                    </div>
                  )}

                  {/* Meilleur créneau */}
                  <TimeSlotCard
                    slot={scheduling.bestSlot}
                    rank={!scheduling.showAlternatives ? 1 : undefined}
                    isSelected={
                      scheduling.selectedSlot?.date === scheduling.bestSlot.date &&
                      scheduling.selectedSlot?.startTime === scheduling.bestSlot.startTime
                    }
                    onSelect={() => scheduling.selectSlot(scheduling.bestSlot)}
                  />

                  {/* Créneaux alternatifs */}
                  {scheduling.showAlternatives && scheduling.alternativeSlots.map((slot) => (
                    <TimeSlotCard
                      key={`${slot.date}-${slot.startTime}`}
                      slot={slot}
                      isSelected={
                        scheduling.selectedSlot?.date === slot.date &&
                        scheduling.selectedSlot?.startTime === slot.startTime
                      }
                      onSelect={() => scheduling.selectSlot(slot)}
                    />
                  ))}

                  {/* Bouton "Voir plus" */}
                  {scheduling.alternativeSlots.length > 0 && (
                    <button
                      onClick={scheduling.toggleAlternatives}
                      className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                    >
                      {scheduling.showAlternatives ? (
                        '← Voir uniquement le meilleur'
                      ) : (
                        `Voir d'autres créneaux (${scheduling.alternativeSlots.length} disponibles)`
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Aucun créneau */}
              {isCalendarConnected && !scheduling.isLoading && !scheduling.bestSlot && !scheduling.error && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <p className="text-orange-800 text-sm">
                    Aucun créneau disponible sur les 7 prochains jours
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-4 border-t border-border bg-white flex-shrink-0 rounded-b-none">
          <ActionButton
            label="Annuler"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          />

          <ActionButton
            label={scheduling.isLoading ? 'En cours...' : 'Caler'}
            variant="plan"
            onClick={handleSchedule}
            disabled={!scheduling.selectedSlot || scheduling.isLoading}
            className="flex-1"
          />
        </div>
      </div>
    </>
  )
}
