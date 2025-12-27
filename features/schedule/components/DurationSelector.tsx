'use client'

// ============================================
// TYPES
// ============================================

interface DurationSelectorProps {
  value: number  // minutes
  onChange: (minutes: number) => void
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
  disabled = false
}: DurationSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-text-dark whitespace-nowrap">
        Durée :
      </label>

      <div className="flex gap-2">
        {DURATIONS.map(duration => {
          const isSelected = value === duration.value

          return (
            <button
              key={duration.value}
              onClick={() => onChange(duration.value)}
              disabled={disabled}
              className={`
                px-3 py-1.5 rounded-lg border transition-all text-sm font-medium
                active:scale-95
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-text-muted'
                }
              `}
            >
              {duration.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
