'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import CaptureInput from '@/components/capture/CaptureInput'
import MoodSelector, { type Mood } from '@/components/capture/MoodSelector'
import VoiceRecorder from '@/components/capture/VoiceRecorder'
import CapturedAnimation from '@/components/capture/CapturedAnimation'
import PendingCounter from '@/components/capture/PendingCounter'
import OrganizeButton from '@/components/capture/OrganizeButton'
import GoogleCalendarCTA from '@/components/capture/GoogleCalendarCTA'
import OrganizeModal from '@/components/capture/OrganizeModal'

export default function CapturePage() {
    const [currentMood, setCurrentMood] = useState<Mood>(null)
    const [captureText, setCaptureText] = useState('')
    const [showAnimation, setShowAnimation] = useState(false)
    const [showOrganizeModal, setShowOrganizeModal] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [isCalendarConnected, setIsCalendarConnected] = useState(false)

    const handleCapture = () => {
        if (!captureText.trim()) return

        // Store capture with current mood
        console.log('Captured:', captureText, 'Mood:', currentMood)

        // Show animation
        setShowAnimation(true)
    }

    const handleVoiceTranscription = (text: string) => {
        setCaptureText(text)
    }

    const handleMoodSelect = (mood: Mood) => {
        setCurrentMood(mood)
    }

    const handleSkip = () => {
        setCurrentMood(null)
    }

    const handleAnimationComplete = () => {
        setPendingCount(prev => prev + 1)
        setShowAnimation(false)
        setCaptureText('')

        // Reset mood after capture
        setCurrentMood(null)
    }

    const handleOrganize = () => {
        setShowOrganizeModal(true)
    }

    const handleCloseModal = () => {
        setShowOrganizeModal(false)
        setPendingCount(0)
    }

    const handleConnectCalendar = () => {
        console.log('Connecting Google Calendar...')
        setIsCalendarConnected(true)
    }

    return (
        <div className="min-h-screen bg-mint flex flex-col">
            <Header />

            <main className="flex-1 flex flex-col px-4 pt-6 pb-24 gap-4">
                {/* Input + Voice */}
                <div className="flex gap-3 items-start">
                    <div className="flex-1">
                        <CaptureInput
                            value={captureText}
                            onChange={setCaptureText}
                            onEnterPress={handleCapture}
                            placeholder="Qu'est-ce qui te tracasse ?"
                        />
                    </div>

                    <VoiceRecorder onTranscription={handleVoiceTranscription} />
                </div>

                {/* Mood Selector - Always visible */}
                <MoodSelector
                    onSelect={handleMoodSelect}
                    onSkip={handleSkip}
                />

                {/* Capture Button */}
                {captureText.trim() && (
                    <button
                        onClick={handleCapture}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-md animate-fadeIn"
                    >
                        Capturer
                    </button>
                )}

                {/* Google Calendar CTA */}
                {!isCalendarConnected && (
                    <GoogleCalendarCTA onConnect={handleConnectCalendar} />
                )}

                {/* Pending Counter */}
                <PendingCounter count={pendingCount} />

                {/* Organize Button */}
                <OrganizeButton
                    count={pendingCount}
                    onClick={handleOrganize}
                />
            </main>

            <BottomNav />

            {/* Animations & Modals */}
            {showAnimation && (
                <CapturedAnimation onComplete={handleAnimationComplete} />
            )}

            <OrganizeModal
                isOpen={showOrganizeModal}
                onClose={handleCloseModal}
                captureCount={pendingCount}
            />
        </div>
    )
}