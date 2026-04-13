'use client'

import { useState, useEffect } from 'react'
import { XIcon, PlusIcon } from '@/components/ui/icons'
import { ExceptionCard } from '@/components/ui/ExceptionCard'
import { ExceptionForm } from '@/components/shared/ExceptionForm'
import { ActionButton } from '@/components/ui/ActionButton'
import type { ScheduleException } from '@/types'

interface ExceptionsModalProps {
  exceptions: ScheduleException[]
  onClose: () => void
  onAdd: (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ExceptionsModal({ exceptions, onClose, onAdd, onDelete }: ExceptionsModalProps) {
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Verrouille le scroll du body sur iOS quand la modale est ouverte
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleAdd = async (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await onAdd(data)
      setShowForm(false)
    } catch (err) {
      console.error('[ExceptionsModal] Erreur sauvegarde:', err)
      setSaveError('Erreur lors de l\'enregistrement. Réessaie.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto max-h-[80dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">Exceptions ponctuelles</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <XIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {saveError && (
            <p className="text-sm text-red-500 text-center">{saveError}</p>
          )}
          {showForm ? (
            <ExceptionForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
          ) : (
            <>
              {exceptions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
                  Aucune exception configurée
                </p>
              ) : (
                <div className="space-y-2">
                  {exceptions.map(ex => (
                    <ExceptionCard key={ex.id} exception={ex} onDelete={onDelete} />
                  ))}
                </div>
              )}
              <ActionButton
                label="Ajouter une exception"
                icon={<PlusIcon className="w-4 h-4" />}
                variant="secondary"
                onClick={() => setShowForm(true)}
                disabled={isSaving}
                fullWidth
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
