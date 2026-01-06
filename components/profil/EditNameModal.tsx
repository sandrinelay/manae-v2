'use client'

import { useState } from 'react'
import { XIcon } from '@/components/ui/icons'
import { ActionButton } from '@/components/ui/ActionButton'

interface EditNameModalProps {
  firstName?: string
  lastName?: string
  onClose: () => void
  onSave: (firstName: string, lastName: string) => Promise<void>
}

export function EditNameModal({
  firstName = '',
  lastName = '',
  onClose,
  onSave
}: EditNameModalProps) {
  const [newFirstName, setNewFirstName] = useState(firstName)
  const [newLastName, setNewLastName] = useState(lastName)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!newFirstName.trim()) return

    setIsSaving(true)
    try {
      await onSave(newFirstName.trim(), newLastName.trim())
    } catch (error) {
      console.error('Erreur sauvegarde nom:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = newFirstName !== firstName || newLastName !== lastName
  const isValid = newFirstName.trim().length > 0

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
            Modifier mon nom
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
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-text-dark mb-1">
              Prénom
            </label>
            <input
              id="firstName"
              type="text"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="Ton prénom"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-text-dark mb-1">
              Nom
            </label>
            <input
              id="lastName"
              type="text"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Ton nom"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
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
            label={isSaving ? 'Enregistrement...' : 'Enregistrer'}
            variant="save"
            onClick={handleSave}
            disabled={!hasChanges || !isValid || isSaving}
            className="flex-1"
          />
        </div>
      </div>
    </>
  )
}
