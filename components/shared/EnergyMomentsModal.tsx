'use client'

import { useState } from 'react'
import { XIcon, SunriseIcon, CoffeeIcon, BriefcaseIcon, SunsetIcon, MoonIcon } from '@/components/ui/icons'
import { EnergyCard } from '@/components/ui/EnergyCard'
import { ActionButton } from '@/components/ui/ActionButton'

interface EnergyMoment {
  id: string
  icon: React.FC<{ className?: string }>
  label: string
  timeRange: string
}

const ENERGY_MOMENTS: EnergyMoment[] = [
  { id: 'morning-energy', icon: SunriseIcon, label: 'Matin énergétique', timeRange: '6h-9h' },
  { id: 'morning', icon: SunriseIcon, label: 'Matinée', timeRange: '9h-12h' },
  { id: 'lunch', icon: CoffeeIcon, label: 'Pause midi', timeRange: '12h-14h' },
  { id: 'afternoon', icon: BriefcaseIcon, label: 'Après-midi', timeRange: '14h-18h' },
  { id: 'evening', icon: SunsetIcon, label: 'Fin de journée', timeRange: '18h-21h' },
  { id: 'night', icon: MoonIcon, label: 'Nuit', timeRange: '21h-6h' },
]

interface EnergyMomentsModalProps {
  selectedMoments: string[]
  onClose: () => void
  onSave: (moments: string[]) => Promise<void>
}

export function EnergyMomentsModal({
  selectedMoments,
  onClose,
  onSave
}: EnergyMomentsModalProps) {
  const [selected, setSelected] = useState<string[]>(selectedMoments)
  const [isSaving, setIsSaving] = useState(false)

  const toggleMoment = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(m => m !== id)
        : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (selected.length === 0) return

    setIsSaving(true)
    try {
      await onSave(selected)
      onClose()
    } catch (error) {
      console.error('Erreur sauvegarde créneaux:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = JSON.stringify(selected.sort()) !== JSON.stringify(selectedMoments.sort())

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md mx-auto max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text-dark">
              Créneaux d'énergie
            </h2>
            <p className="text-sm text-text-muted">
              Quand préfères-tu avancer sur tes tâches ?
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            {ENERGY_MOMENTS.map(moment => (
              <EnergyCard
                key={moment.id}
                id={moment.id}
                icon={moment.icon}
                label={moment.label}
                timeRange={moment.timeRange}
                selected={selected.includes(moment.id)}
                onClick={() => toggleMoment(moment.id)}
              />
            ))}
          </div>

          {selected.length === 0 && (
            <p className="text-sm text-text-muted text-center mt-4">
              Sélectionne au moins un créneau
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0">
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
            disabled={selected.length === 0 || !hasChanges || isSaving}
            className="flex-1"
          />
        </div>
      </div>
    </>
  )
}
