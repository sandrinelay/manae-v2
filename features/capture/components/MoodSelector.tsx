'use client'

type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired'

interface MoodSelectorProps {
  selectedMood: Mood | null
  onSelectMood: (mood: Mood) => void
  disabled?: boolean
}

const MOODS = [
  {
    value: 'energetic' as Mood,
    icon: '⚡',
    label: 'Énergique',
    bgSelected: 'bg-orange-500',
    bgHover: 'hover:border-orange-300'
  },
  {
    value: 'calm' as Mood,
    icon: '☕',
    label: 'Calme',
    bgSelected: 'bg-primary',
    bgHover: 'hover:border-primary'
  },
  {
    value: 'overwhelmed' as Mood,
    icon: '⚠️',
    label: 'Débordé(e)',
    bgSelected: 'bg-red-500',
    bgHover: 'hover:border-red-300'
  },
  {
    value: 'tired' as Mood,
    icon: '😴',
    label: 'Fatigué(e)',
    bgSelected: 'bg-slate-500',
    bgHover: 'hover:border-slate-400'
  }
]

export function MoodSelector({ selectedMood, onSelectMood, disabled }: MoodSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-dark">
        Comment te sens-tu ? <span className="text-text-muted font-normal">(facultatif)</span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.value

          return (
            <button
              key={mood.value}
              onClick={() => onSelectMood(mood.value)}
              disabled={disabled}
              className={`
                relative py-4 px-3 rounded-2xl font-medium transition-all
                ${isSelected
                  ? `${mood.bgSelected} text-white shadow-lg scale-105`
                  : `bg-white border-2 border-border text-text-dark ${mood.bgHover}`
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className="text-3xl block mb-2">{mood.icon}</span>
              <span className="text-xs block">{mood.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { Mood }
