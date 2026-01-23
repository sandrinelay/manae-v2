'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar';
import { updateUserProfile } from '@/services/supabaseService';

function OnboardingStep4Content() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Vérifier si on vient d'un flux de planification
    const returnTo = searchParams.get('returnTo');

    const handleConnect = async () => {
        console.log('[Step4] handleConnect - Starting Google auth');
        setIsLoading(true);
        setError(null);
        try {
            console.log('[Step4] Opening Google auth popup');
            const code = await openGoogleAuthPopup();
            console.log('[Step4] Received code from popup:', code);
            const tokens = await exchangeCodeForToken(code);
            console.log('[Step4] Exchanged code for tokens:', tokens);

            // Calculer expires_at à partir de expires_in (en secondes)
            const tokensWithExpiry = {
                ...tokens,
                expires_at: Date.now() + (tokens.expires_in * 1000)
            };

            // Save tokens locally (TODO: sauvegarder côté serveur de façon sécurisée)
            // Utiliser 'google_tokens' pour compatibilité avec calendar.service
            localStorage.setItem('google_tokens', JSON.stringify(tokensWithExpiry));

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

            // Rediriger vers la bonne destination
            if (returnTo === 'planning') {
                // Vérifier si on vient de Clarté ou de Capture
                const pendingPlanning = localStorage.getItem('manae_pending_planning')
                if (pendingPlanning) {
                    const context = JSON.parse(pendingPlanning)
                    if (context.returnTo === 'clarte-schedule') {
                        // Retour vers /clarte avec flag pour restaurer le contexte de planification
                        router.push('/clarte?resumePlanning=true')
                        return
                    }
                }
                // Retour vers /capture avec flag pour restaurer le contexte de planification
                router.push('/capture?resumePlanning=true');
            } else {
                router.push('/capture');
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('Une erreur est survenue lors de la connexion.');
        } finally {
            setIsLoading(false);
        }
    };
    const handleBack = () => {
        router.push('/onboarding/step3');
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
        <div className="min-h-screen bg-mint flex items-start justify-center">
            <div className="w-full max-w-md">


                {/* Content */}
                <main>
                    <h2 className="text-2xl font-bold text-text-dark mb-3">
                        Connecte ton Google Calendar
                    </h2>
                    <p className="text-base text-text-medium mb-8 leading-relaxed">
                        Pour que je puisse vérifier tes disponibilités et ajouter tes tâches au bon moment.
                    </p>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
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
                            className="text-text-muted hover:text-text-dark text-sm font-medium transition-colors mt-4 mb-6"
                        >
                            Passer cette étape pour le moment
                        </button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleBack}
                            className="flex-1"
                        >
                            ← Retour
                        </Button>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function OnboardingStep4() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-mint flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        }>
            <OnboardingStep4Content />
        </Suspense>
    );
}
