'use client'

import { CONTEXT_CONFIG } from '@/config/contexts'
import type { ItemContext } from '@/types/items'

// ============================================
// TYPES
// ============================================

interface ContextSelectorProps {
  value: ItemContext | null
  onChange: (context: ItemContext) => void
  aiSuggested?: ItemContext  // Pour highlight la suggestion IA
  disabled?: boolean
}

// Liste des contextes à afficher (sans 'other' pour le scheduling)
const CONTEXT_KEYS: ItemContext[] = ['personal', 'family', 'work', 'health']

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
        {CONTEXT_KEYS.map(contextKey => {
          const config = CONTEXT_CONFIG[contextKey]
          const Icon = config.icon
          const isSelected = value === contextKey
          const isAISuggested = aiSuggested === contextKey

          return (
            <button
              key={contextKey}
              onClick={() => onChange(contextKey)}
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
                <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : config.colorClass}`} />
                <span className={`
                  text-sm font-medium
                  ${isSelected ? 'text-primary' : 'text-text-muted'}
                `}>
                  {config.label}
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
          ✨ L&apos;IA suggère le contexte &quot;{CONTEXT_CONFIG[aiSuggested]?.label}&quot;
        </p>
      )}
    </div>
  )
}
