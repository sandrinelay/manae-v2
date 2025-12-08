'use client'

import { useState, useEffect } from 'react'
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
import { createThought, getThoughtsCount } from '@/services/supabaseService'
import { useAuth } from '@/hooks/useAuth'


export default function CapturePage() {
    const { user, isLoading: isAuthLoading } = useAuth()
    const [currentMood, setCurrentMood] = useState<Mood>(null)
    const [captureText, setCaptureText] = useState('')
    const [showAnimation, setShowAnimation] = useState(false)
    const [showOrganizeModal, setShowOrganizeModal] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [isCalendarConnected, setIsCalendarConnected] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Charger le count initial depuis Supabase une fois authentifié
    useEffect(() => {
        const loadCount = async () => {
            if (!user) return
            try {
                const count = await getThoughtsCount()
                setPendingCount(count)
            } catch (error) {
                console.error('Error loading thoughts count:', error)
            }
        }
        loadCount()
    }, [user])

    const handleCapture = async (text: string) => {
        if (isSaving || !text.trim() || isAuthLoading || !user) return

        setIsSaving(true)

        try {
            // Save to Supabase thoughts table
            await createThought({
                raw_text: text.trim(),
                mood: currentMood
            })

            console.log('Saved to Supabase:', text, 'Mood:', currentMood)

            // Show animation
            setShowAnimation(true)
        } catch (error) {
            console.error('Error saving capture:', error)
            alert('Erreur lors de la sauvegarde')
        } finally {
            setIsSaving(false)
        }
    }

    const handleVoiceTranscription = async (text: string) => {
        await handleCapture(text)
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
                            onEnterPress={() => handleCapture(captureText)}
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
                        onClick={() => handleCapture(captureText)}
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
                    disabled={isSaving}
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