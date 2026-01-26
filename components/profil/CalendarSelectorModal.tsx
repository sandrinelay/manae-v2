'use client'

import { useState, useEffect, useCallback } from 'react'
import { XIcon, CheckIcon } from '@/components/ui/icons'
import { ActionButton } from '@/components/ui/ActionButton'
import {
  getCalendarList,
  getSelectedCalendarIds,
  saveSelectedCalendarIds,
  type GoogleCalendar
} from '@/features/schedule/services/calendar.service'

interface CalendarSelectorModalProps {
  onClose: () => void
  onSaved?: () => void
}

export function CalendarSelectorModal({ onClose, onSaved }: CalendarSelectorModalProps) {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Charger la liste des calendriers
  const loadCalendars = useCallback(async () => {
    // Vérifier d'abord si les tokens existent
    const tokens = localStorage.getItem('google_tokens')
    if (!tokens) {
      // Pas connecté : fermer la modale
      onClose()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const calendarList = await getCalendarList()
      setCalendars(calendarList)

      // Récupérer les sélections existantes ou sélectionner tous par défaut
      const currentSelection = getSelectedCalendarIds()
      if (currentSelection.length === 1 && currentSelection[0] === 'primary') {
        // Première fois : sélectionner tous les calendriers
        setSelectedIds(calendarList.map(c => c.id))
      } else {
        setSelectedIds(currentSelection)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de chargement'
      // Si erreur de connexion, fermer la modale
      if (errorMsg.includes('non connecté') || errorMsg.includes('expirée')) {
        onClose()
        return
      }
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [onClose])

  useEffect(() => {
    loadCalendars()
  }, [loadCalendars])

  // Toggle un calendrier
  const toggleCalendar = (calendarId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(calendarId)) {
        // Ne pas permettre de tout décocher
        if (prev.length <= 1) return prev
        return prev.filter(id => id !== calendarId)
      } else {
        return [...prev, calendarId]
      }
    })
  }

  // Sauvegarder
  const handleSave = async () => {
    setIsSaving(true)
    try {
      saveSelectedCalendarIds(selectedIds)
      onSaved?.()
      onClose()
    } catch {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-text-dark">
            Mes calendriers
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={loadCalendars}
                className="mt-2 text-red-600 text-sm underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-2">
              <p className="text-sm text-text-muted mb-3">
                Sélectionne les calendriers à utiliser :
              </p>

              {calendars.map(calendar => (
                <button
                  key={calendar.id}
                  onClick={() => toggleCalendar(calendar.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    selectedIds.includes(calendar.id)
                      ? 'border-primary bg-mint'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  {/* Checkbox visuel */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      selectedIds.includes(calendar.id)
                        ? 'bg-primary'
                        : 'bg-gray-200'
                    }`}
                  >
                    {selectedIds.includes(calendar.id) && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Couleur du calendrier */}
                  {calendar.backgroundColor && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: calendar.backgroundColor }}
                    />
                  )}

                  {/* Nom */}
                  <span className="flex-1 text-text-dark truncate text-sm">
                    {calendar.summary}
                    {calendar.primary && (
                      <span className="text-text-muted text-xs ml-2">(principal)</span>
                    )}
                  </span>
                </button>
              ))}

              {calendars.length === 0 && (
                <p className="text-center text-text-muted py-4">
                  Aucun calendrier trouvé
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-100">
          <ActionButton
            label="Annuler"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          />
          <ActionButton
            label={isSaving ? 'Enregistrement...' : 'Valider'}
            variant="save"
            onClick={handleSave}
            disabled={isLoading || selectedIds.length === 0 || isSaving}
            className="flex-1"
          />
        </div>
      </div>
    </>
  )
}
