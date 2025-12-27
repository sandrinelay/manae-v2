'use client'

// ============================================
// TYPES
// ============================================

export type ItemContext = 'personal' | 'family' | 'work' | 'health'

interface ContextSelectorProps {
  value: ItemContext | null
  onChange: (context: ItemContext) => void
  aiSuggested?: ItemContext  // Pour highlight la suggestion IA
  disabled?: boolean
}

const CONTEXTS: Array<{
  value: ItemContext
  label: string
  icon: string
}> = [
  { value: 'personal', label: 'Personnel', icon: '👤' },
  { value: 'family', label: 'Famille', icon: '👨‍👩‍👧' },
  { value: 'work', label: 'Travail', icon: '💼' },
  { value: 'health', label: 'Santé', icon: '🏃' }
]

// ============================================
// COMPOSANT
// ============================================

export function ContextSelector({
  value,
  onChange,
  aiSuggested,
  disabled = false
}: ContextSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-dark">
        Contexte
      </label>

      <div className="grid grid-cols-2 gap-2">
        {CONTEXTS.map(context => {
          const isSelected = value === context.value
          const isAISuggested = aiSuggested === context.value

          return (
            <button
              key={context.value}
              onClick={() => onChange(context.value)}
              disabled={disabled}
              className={`
                px-3 py-2 rounded-lg border-2 transition-all
                hover:shadow-sm active:scale-95
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{context.icon}</span>
                <span className={`
                  text-sm font-medium
                  ${isSelected ? 'text-primary' : 'text-text-muted'}
                `}>
                  {context.label}
                </span>
                {isAISuggested && !isSelected && (
                  <span className="text-xs ml-auto">✨</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {aiSuggested && (
        <p className="text-xs text-text-muted">
          ✨ L'IA suggère le contexte "{CONTEXTS.find(c => c.value === aiSuggested)?.label}"
        </p>
      )}
    </div>
  )
}
