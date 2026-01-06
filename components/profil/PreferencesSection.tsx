'use client'

import { useState } from 'react'
import { ChevronRightIcon, ZapIcon, CalendarOffIcon } from '@/components/ui/icons'
import { EnergyMomentsModal } from '@/components/shared/EnergyMomentsModal'
import { ConstraintsModal } from '@/components/shared/ConstraintsModal'
import type { Constraint } from '@/types'

interface PreferencesSectionProps {
  energyMoments: string[]
  constraints: Constraint[]
  onSaveEnergyMoments: (moments: string[]) => Promise<void>
  onSaveConstraints: (constraints: Constraint[]) => Promise<void>
}

const ENERGY_LABELS: Record<string, string> = {
  'morning-energy': 'Matin (6h-9h)',
  'morning': 'Matinée (9h-12h)',
  'lunch': 'Midi (12h-14h)',
  'afternoon': 'Après-midi (14h-18h)',
  'evening': 'Soir (18h-21h)',
  'night': 'Nuit (21h-6h)'
}

export function PreferencesSection({
  energyMoments,
  constraints,
  onSaveEnergyMoments,
  onSaveConstraints
}: PreferencesSectionProps) {
  const [showEnergyModal, setShowEnergyModal] = useState(false)
  const [showConstraintsModal, setShowConstraintsModal] = useState(false)

  const energySummary = energyMoments.length > 0
    ? energyMoments.map(m => ENERGY_LABELS[m] || m).join(', ')
    : 'Non configuré'

  const constraintsSummary = constraints.length > 0
    ? `${constraints.length} indisponibilité${constraints.length > 1 ? 's' : ''}`
    : 'Non configuré'

  return (
    <>
      <section className="bg-white rounded-2xl overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Préférences
        </h2>

        {/* Créneaux d'énergie */}
        <button
          onClick={() => setShowEnergyModal(true)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ZapIcon className="w-5 h-5 text-amber-500" />
            <div className="text-left">
              <p className="text-sm text-text-muted">Créneaux d'énergie</p>
              <p className="text-text-dark text-sm">{energySummary}</p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </button>

        {/* Indisponibilités */}
        <button
          onClick={() => setShowConstraintsModal(true)}
          className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CalendarOffIcon className="w-5 h-5 text-red-400" />
            <div className="text-left">
              <p className="text-sm text-text-muted">Indisponibilités</p>
              <p className="text-text-dark text-sm">{constraintsSummary}</p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </button>
      </section>

      {showEnergyModal && (
        <EnergyMomentsModal
          selectedMoments={energyMoments}
          onClose={() => setShowEnergyModal(false)}
          onSave={onSaveEnergyMoments}
        />
      )}

      {showConstraintsModal && (
        <ConstraintsModal
          constraints={constraints}
          onClose={() => setShowConstraintsModal(false)}
          onSave={onSaveConstraints}
        />
      )}
    </>
  )
}
