'use client'

import type { ReactNode } from 'react'

type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired'

interface MoodSelectorProps {
  selectedMood: Mood | null
  onSelectMood: (mood: Mood | null) => void
  disabled?: boolean
}

// Icônes SVG style maquette
const EnergeticIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const CalmIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
    <circle cx="12" cy="12" r="4" />
  </svg>
)

const OverwhelmedIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
  </svg>
)

const TiredIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h.01M15 9h.01M9 15h6" />
  </svg>
)

interface MoodConfig {
  value: Mood
  icon: ReactNode
  label: string
  bgSelected: string
  iconColorSelected: string
}

const MOODS: MoodConfig[] = [
  {
    value: 'energetic',
    icon: <EnergeticIcon />,
    label: 'Énergique',
    bgSelected: 'bg-[#E89B6C]', // Orange pastel - énergie, vitalité, enthousiasme
    iconColorSelected: 'text-white'
  },
  {
    value: 'calm',
    icon: <CalmIcon />,
    label: 'Calme',
    bgSelected: 'bg-[#7EB89E]', // Vert pastel - sérénité, équilibre, harmonie
    iconColorSelected: 'text-white'
  },
  {
    value: 'overwhelmed',
    icon: <OverwhelmedIcon />,
    label: 'Débordé(e)',
    bgSelected: 'bg-[#E07B7B]', // Corail saturé pastel - stress, urgence, tension
    iconColorSelected: 'text-white'
  },
  {
    value: 'tired',
    icon: <TiredIcon />,
    label: 'Fatigué(e)',
    bgSelected: 'bg-[#8E9AAF]', // Gris pastel bleuté - fatigue, repos, calme
    iconColorSelected: 'text-white'
  }
]

export function MoodSelector({ selectedMood, onSelectMood, disabled }: MoodSelectorProps) {
  const handleMoodClick = (moodValue: Mood) => {
    if (selectedMood === moodValue) {
      onSelectMood(null)
    } else {
      onSelectMood(moodValue)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-text-dark uppercase tracking-wide">
        Comment te sens-tu ? (optionnel)
      </p>
      <div className="flex gap-3">
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.value

          return (
            <button
              key={mood.value}
              onClick={() => handleMoodClick(mood.value)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-2xl flex-1
                transition-all duration-200 ease-out
                transform 
                ${isSelected
                  ? `${mood.bgSelected} shadow-lg `
                  : 'bg-white  hover:border-primary/30 hover:shadow-md'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {/* Icon circle */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-200
                ${isSelected
                  ? 'bg-white/20 scale-110'
                  : 'bg-gray-light'
                }
              `}>
                <div className={`transition-colors duration-200 ${isSelected ? mood.iconColorSelected : 'text-text-muted'}`}>
                  {mood.icon}
                </div>
              </div>
              {/* Label */}
              <span className={`text-xs font-medium transition-colors duration-200 ${isSelected ? 'text-white' : 'text-text-dark'}`}>
                {mood.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { Mood }
