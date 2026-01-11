'use client'

import { useRef, useEffect } from 'react'

interface CaptureInputProps {
    value: string
    onChange: (text: string) => void
    onEnterPress?: () => void
    placeholder?: string
}

export default function CaptureInput({ value, onChange, onEnterPress, placeholder }: CaptureInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Submit on Enter (but not Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnterPress?.()
        }
    }

    return (
        <div className="bg-white rounded-xl border-2 border-border focus-within:border-primary transition-colors shadow-sm">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "Qu'est-ce qui te tracasse ?"}
                className="input-field border-0 resize-none font-quicksand min-h-[60px] max-h-[200px]"
                rows={1}
            />
        </div>
    )
}