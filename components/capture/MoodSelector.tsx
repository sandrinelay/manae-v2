'use client'

import { useState } from 'react'

export type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired' | null

interface MoodSelectorProps {
    onSelect: (mood: Mood) => void
    onSkip: () => void
}

export default function MoodSelector({ onSelect, onSkip }: MoodSelectorProps) {
    const [selected, setSelected] = useState<Mood>(null)

    const moods = [
        { value: 'energetic' as const, emoji: '😊', label: 'Énergique' },
        { value: 'calm' as const, emoji: '😌', label: 'Calme' },
        { value: 'overwhelmed' as const, emoji: '🤯', label: 'Débordée' },
        { value: 'tired' as const, emoji: '😫', label: 'Fatiguée' },
    ]

    const handleSelect = (mood: Mood) => {
        setSelected(mood)
        onSelect(mood)
    }

    return (
        <div className="animate-fadeIn">
            <p className="text-text-medium text-sm font-medium mb-3 font-quicksand">
                Comment tu te sens ?
            </p>

            <div className="flex items-center gap-2 flex-wrap">
                {moods.map((mood) => (
                    <button
                        key={mood.value}
                        onClick={() => handleSelect(mood.value)}
                        className={`flex-1 min-w-[70px] px-3 py-2.5 rounded-lg border-2 transition-all ${selected === mood.value
                                ? 'border-primary bg-primary/5 scale-105'
                                : 'border-border hover:border-primary/50 hover:bg-mint'
                            }`}
                    >
                        <div className="text-2xl mb-1">{mood.emoji}</div>
                        <div className={`text-xs font-medium ${selected === mood.value ? 'text-primary' : 'text-text-medium'
                            }`}>
                            {mood.label}
                        </div>
                    </button>
                ))}

                <button
                    onClick={() => {
                        setSelected(null)
                        onSkip()
                    }}
                    className="px-4 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-text-muted hover:bg-gray-light transition-all text-text-muted hover:text-text-dark text-sm font-medium"
                >
                    Skip
                </button>
            </div>
        </div>
    )
}