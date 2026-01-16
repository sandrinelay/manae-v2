'use client'

import type { ReactNode } from 'react'
import { EnergeticIcon, CalmIcon, OverwhelmedIcon, TiredIcon } from '@/components/ui/icons'
import { MOOD_LABELS, SECTION_LABELS } from '@/constants/labels'

type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired'

interface MoodSelectorProps {
  selectedMood: Mood | null
  onSelectMood: (mood: Mood | null) => void
  disabled?: boolean
}

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
    icon: <EnergeticIcon className="w-6 h-6" />,
    label: MOOD_LABELS.energetic,
    bgSelected: 'bg-mood-energetic',
    iconColorSelected: 'text-white'
  },
  {
    value: 'calm',
    icon: <CalmIcon className="w-6 h-6" />,
    label: MOOD_LABELS.calm,
    bgSelected: 'bg-mood-calm',
    iconColorSelected: 'text-white'
  },
  {
    value: 'overwhelmed',
    icon: <OverwhelmedIcon className="w-6 h-6" />,
    label: MOOD_LABELS.overwhelmed,
    bgSelected: 'bg-mood-overwhelmed',
    iconColorSelected: 'text-white'
  },
  {
    value: 'tired',
    icon: <TiredIcon className="w-6 h-6" />,
    label: MOOD_LABELS.tired,
    bgSelected: 'bg-mood-tired',
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
      <div>
        <p className="typo-form-label">
          {SECTION_LABELS.moodQuestion}
        </p>
        <p className="typo-hint mt-1">
          {SECTION_LABELS.moodHint}
        </p>
      </div>
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
