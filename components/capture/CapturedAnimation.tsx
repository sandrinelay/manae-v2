'use client'

import { useEffect, useState } from 'react'

interface CapturedAnimationProps {
    onComplete: () => void
}

export default function CapturedAnimation({ onComplete }: CapturedAnimationProps) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onComplete, 300) // Wait for fade out
        }, 1500)

        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
        >
            <div className="bg-white rounded-2xl p-8 shadow-2xl animate-scaleIn">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckIcon />
                    </div>
                    <p className="text-text-dark font-medium font-quicksand">
                        Capturé !
                    </p>
                </div>
            </div>
        </div>
    )
}

function CheckIcon() {
    return (
        <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary animate-checkDraw"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}