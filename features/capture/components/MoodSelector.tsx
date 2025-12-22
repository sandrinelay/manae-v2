'use client'

import type { ReactNode } from 'react'

type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired'

interface MoodSelectorProps {
  selectedMood: Mood | null
  onSelectMood: (mood: Mood | null) => void
  disabled?: boolean
}

// Icônes SVG minimalistes
const EnergeticIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const CalmIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
)

const OverwhelmedIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TiredIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

interface MoodConfig {
  value: Mood
  icon: ReactNode
  label: string
  bgSelected: string
  bgHover: string
}

const MOODS: MoodConfig[] = [
  {
    value: 'energetic',
    icon: <EnergeticIcon />,
    label: 'Énergique',
    bgSelected: 'bg-orange-500',
    bgHover: 'hover:border-orange-300'
  },
  {
    value: 'calm',
    icon: <CalmIcon />,
    label: 'Calme',
    bgSelected: 'bg-primary',
    bgHover: 'hover:border-primary'
  },
  {
    value: 'overwhelmed',
    icon: <OverwhelmedIcon />,
    label: 'Débordé(e)',
    bgSelected: 'bg-red-500',
    bgHover: 'hover:border-red-300'
  },
  {
    value: 'tired',
    icon: <TiredIcon />,
    label: 'Fatigué(e)',
    bgSelected: 'bg-slate-500',
    bgHover: 'hover:border-slate-400'
  }
]

export function MoodSelector({ selectedMood, onSelectMood, disabled }: MoodSelectorProps) {
  // Re-clic sur un mood sélectionné = désélection
  const handleMoodClick = (moodValue: Mood) => {
    if (selectedMood === moodValue) {
      onSelectMood(null)
    } else {
      onSelectMood(moodValue)
    }
  }

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
              onClick={() => handleMoodClick(mood.value)}
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
              <div className={`flex justify-center mb-2 ${isSelected ? 'text-white' : 'text-text-muted'}`}>
                {mood.icon}
              </div>
              <span className="text-xs block text-center">{mood.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { Mood }
