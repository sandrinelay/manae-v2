'use client'

import { ChevronRightIcon, CalendarOffIcon, BriefcaseIcon, SparklesIcon } from '@/components/ui/icons'
import type { Constraint, ScheduleException } from '@/types'

interface OrganisationSectionProps {
  constraints: Constraint[]
  exceptions: ScheduleException[]
  onShowConstraintsModal: () => void
  onShowExceptionsModal: () => void
  onQuickSetupWorkHours: () => void
}

export function OrganisationSection({
  constraints,
  exceptions,
  onShowConstraintsModal,
  onShowExceptionsModal,
  onQuickSetupWorkHours
}: OrganisationSectionProps) {
  const constraintsSummary = constraints.length > 0
    ? `${constraints.length} plage${constraints.length > 1 ? 's' : ''} configurée${constraints.length > 1 ? 's' : ''}`
    : 'Non configuré'

  const exceptionsSummary = exceptions.length > 0
    ? `${exceptions.length} exception${exceptions.length > 1 ? 's' : ''}`
    : 'Aucune exception'

  const hasWorkConstraint = constraints.some(c => c.context === 'work')

  return (
    <section className="bg-white rounded-2xl overflow-hidden">
      <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        Mon organisation
      </h2>

      {/* Plages horaires récurrentes */}
      <button
        onClick={onShowConstraintsModal}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <CalendarOffIcon className="w-5 h-5 text-[var(--color-primary)]" />
          <div className="text-left">
            <p className="text-sm text-[var(--color-text-muted)]">Plages horaires</p>
            <p className="text-sm text-[var(--color-text-dark)]">{constraintsSummary}</p>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
      </button>

      {/* Quick setup — affiché uniquement si pas encore d'horaires pro */}
      {!hasWorkConstraint && (
        <button
          onClick={onQuickSetupWorkHours}
          className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 hover:bg-amber-50 transition-colors group"
        >
          <BriefcaseIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm text-amber-600 font-medium group-hover:text-amber-700">
            Configurer mes heures pro
          </span>
          <SparklesIcon className="w-3.5 h-3.5 text-amber-400 ml-auto" />
        </button>
      )}

      {/* Exceptions ponctuelles */}
      <button
        onClick={onShowExceptionsModal}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BriefcaseIcon className="w-5 h-5 text-amber-500" />
          <div className="text-left">
            <p className="text-sm text-[var(--color-text-muted)]">Exceptions ponctuelles</p>
            <p className="text-sm text-[var(--color-text-dark)]">{exceptionsSummary}</p>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
      </button>
    </section>
  )
}
