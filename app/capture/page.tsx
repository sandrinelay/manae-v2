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
import { useAuth } from '@/hooks/useAuth'
import { useItemCapture } from '@/hooks/useItemCapture'
import { getItemsCount } from '@/services/supabase/items.service'
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar'
import type { Mood as ItemMood } from '@/types/items'


export default function CapturePage() {
    const { user, isLoading: isAuthLoading } = useAuth()
    const [currentMood, setCurrentMood] = useState<Mood>(null)
    const [captureText, setCaptureText] = useState('')
    const [showAnimation, setShowAnimation] = useState(false)
    const [showOrganizeModal, setShowOrganizeModal] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [isCalendarConnected, setIsCalendarConnected] = useState(false)
    const [isConnectingCalendar, setIsConnectingCalendar] = useState(false)

    const {
        captureAndAnalyze,
        isCapturing,
        isAnalyzing,
        error: captureError
    } = useItemCapture({
        onCaptureSuccess: () => {
            setShowAnimation(true)
        },
        onCaptureError: (error) => {
            console.error('Error saving capture:', error)
            alert('Erreur lors de la sauvegarde')
        }
    })

    // Fonction pour rafraîchir le count des items captured
    const refreshPendingCount = async () => {
        if (!user) return
        try {
            const count = await getItemsCount({ state: 'captured' })
            setPendingCount(count)
        } catch (error) {
            console.error('Error loading items count:', error)
        }
    }

    // Charger le count initial depuis Supabase une fois authentifié
    useEffect(() => {
        refreshPendingCount()
    }, [user])

    // Vérifier si Google Calendar est déjà connecté
    useEffect(() => {
        const tokens = localStorage.getItem('google_tokens')
        if (tokens) {
            setIsCalendarConnected(true)
        }
    }, [])

    // Convertir le Mood du composant vers le Mood des items
    const convertMood = (mood: Mood): ItemMood | undefined => {
        if (!mood) return undefined
        // Le MoodSelector utilise 'energetic' | 'neutral' | 'tired' | null
        // qui correspond exactement à notre ItemMood
        return mood as ItemMood
    }

    const handleCapture = async (text: string) => {
        if (isCapturing || isAnalyzing || !text.trim() || isAuthLoading || !user) return

        try {
            // Capture et analyse avec la nouvelle architecture
            await captureAndAnalyze(text.trim(), convertMood(currentMood))
            console.log('Saved to Supabase:', text, 'Mood:', currentMood)
        } catch (error) {
            // L'erreur est déjà gérée par onCaptureError
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

    const handleAnimationComplete = async () => {
        setShowAnimation(false)
        setCaptureText('')
        setCurrentMood(null)
        // Rafraîchir le count après la capture
        await refreshPendingCount()
    }

    const handleOrganize = () => {
        setShowOrganizeModal(true)
    }

    const handleCloseModal = () => {
        setShowOrganizeModal(false)
    }

    const handleConnectCalendar = async () => {
        if (isConnectingCalendar) return

        setIsConnectingCalendar(true)

        try {
            // Ouvrir popup OAuth Google
            const code = await openGoogleAuthPopup()

            // Échanger le code contre un token
            const tokens = await exchangeCodeForToken(code)

            // Stocker les tokens (localStorage pour l'instant, TODO: secure storage)
            localStorage.setItem('google_tokens', JSON.stringify(tokens))

            setIsCalendarConnected(true)

            // Notifier le Header que la connexion a réussi
            window.dispatchEvent(new CustomEvent('calendar-connection-changed', {
                detail: { connected: true }
            }))

            console.log('Google Calendar connected successfully')
        } catch (error) {
            console.error('Error connecting Google Calendar:', error)
            // Ne pas mettre isCalendarConnected à true en cas d'erreur
        } finally {
            setIsConnectingCalendar(false)
        }
    }

    const isSaving = isCapturing || isAnalyzing

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
                        disabled={isSaving}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-md animate-fadeIn disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Analyse en cours...' : 'Capturer'}
                    </button>
                )}

                {/* Google Calendar CTA */}
                {!isCalendarConnected && (
                    <GoogleCalendarCTA
                        onConnect={handleConnectCalendar}
                        isConnecting={isConnectingCalendar}
                    />
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
                onSuccess={refreshPendingCount}
            />
        </div>
    )
}
