'use client'

// ============================================
// TYPES
// ============================================

interface DurationSelectorProps {
  value: number  // minutes
  onChange: (minutes: number) => void
  aiSuggested?: number  // Pour highlight la suggestion IA
  disabled?: boolean
}

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1h' }
] as const

// ============================================
// COMPOSANT
// ============================================

export function DurationSelector({
  value,
  onChange,
  aiSuggested,
  disabled = false
}: DurationSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-dark">
        Durée estimée
      </label>

      <div className="flex gap-2">
        {DURATIONS.map(duration => {
          const isSelected = value === duration.value
          const isAISuggested = aiSuggested === duration.value

          return (
            <button
              key={duration.value}
              onClick={() => onChange(duration.value)}
              disabled={disabled}
              className={`
                flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium
                hover:shadow-sm active:scale-95
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-text-muted'
                }
              `}
            >
              <div className="flex items-center justify-center gap-1">
                <span>{duration.label}</span>
                {isAISuggested && !isSelected && (
                  <span className="text-xs" title="Suggéré par l'IA">
                    ✨
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {aiSuggested && (
        <p className="text-xs text-text-muted">
          ✨ L'IA suggère {aiSuggested} min pour cette tâche
        </p>
      )}
    </div>
  )
}
