'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar';
import { updateUserProfile } from '@/services/supabaseService';

export default function OnboardingStep4() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const code = await openGoogleAuthPopup();
            const tokens = await exchangeCodeForToken(code);

            // Save tokens locally (TODO: sauvegarder côté serveur de façon sécurisée)
            localStorage.setItem('manae_google_tokens', JSON.stringify(tokens));

            // Marquer l'onboarding comme terminé dans Supabase
            await updateUserProfile({
                onboarding_completed: true
            });

            // Garder aussi en localStorage
            const onboardingData = localStorage.getItem('manae_onboarding');
            const parsedData = onboardingData ? JSON.parse(onboardingData) : {};
            localStorage.setItem('manae_onboarding', JSON.stringify({
                ...parsedData,
                step: 4,
                completed_at: new Date().toISOString()
            }));

            router.push('/capture');
        } catch (err) {
            console.error('Auth error:', err);
            setError('Une erreur est survenue lors de la connexion.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = async () => {
        try {
            // Marquer l'onboarding comme terminé même sans Google Calendar
            await updateUserProfile({
                onboarding_completed: true
            });
        } catch (error) {
            console.error('Error updating profile:', error);
        }
        router.push('/capture');
    };

    return (
        <div className="min-h-screen bg-mint flex items-start justify-center p-6 pt-12">
            <div className="w-full max-w-md">
                {/* Header */}
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-secondary tracking-tight" style={{ fontFamily: 'var(--font-quicksand)' }}>
                        manae
                    </h1>
                    <span className="text-sm font-medium text-text-muted bg-white px-3 py-1 rounded-full">
                        Étape 4 / 4
                    </span>
                </header>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary via-secondary to-primary"
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Content */}
                <main>
                    <h2 className="text-2xl font-bold text-text-dark mb-3">
                        Connecte ton Google Calendar
                    </h2>
                    <p className="text-base text-text-medium mb-8 leading-relaxed">
                        Pour que je puisse vérifier tes disponibilités et ajouter tes tâches au bon moment.
                    </p>

                    <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-3xl">
                            📅
                        </div>
                        <h3 className="text-lg font-semibold text-text-dark mb-2">Google Calendar</h3>
                        <p className="text-sm text-text-muted mb-6">
                            Synchronisation bidirectionnelle pour une planification parfaite.
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg w-full">
                                {error}
                            </div>
                        )}

                        <Button
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? 'Connexion...' : 'Connecter mon agenda'}
                        </Button>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleSkip}
                            className="text-text-muted hover:text-text-dark text-sm font-medium transition-colors"
                        >
                            Passer cette étape pour le moment
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}
