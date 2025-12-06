'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar';
import { supabase } from '@/lib/supabase';

export default function OnboardingStep4() {
    const router = useRouter();
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnectGoogle = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            // Ouvrir la popup Google
            const code = await openGoogleAuthPopup();

            // Échanger le code contre un token
            const tokenData = await exchangeCodeForToken(code);

            // Finaliser l'onboarding avec Google connecté
            await completeOnboarding(true, tokenData);
        } catch (err: any) {
            console.error('Erreur OAuth:', err);
            setError(err.message === 'Popup bloquée par le navigateur'
                ? 'Autorise les popups pour continuer'
                : 'Erreur de connexion. Réessaie.');
            setIsConnecting(false);
        }
    };

    const handleSkip = async () => {
        await completeOnboarding(false);
    };

    const completeOnboarding = async (googleConnected: boolean, tokenData?: any) => {
        try {
            // Récupérer toutes les données du localStorage
            const onboardingData = localStorage.getItem('manae_onboarding');
            const parsedData = onboardingData ? JSON.parse(onboardingData) : {};

            // Finaliser les données
            const finalData = {
                ...parsedData,
                step: 4,
                google_calendar_connected: googleConnected,
                google_calendar_token: tokenData?.access_token || null,
                google_refresh_token: tokenData?.refresh_token || null,
                onboarding_completed: true,
                completed_at: new Date().toISOString()
            };

            // Sauvegarder dans localStorage
            localStorage.setItem('manae_onboarding', JSON.stringify(finalData));
            console.log('✅ Onboarding complété:', finalData);

            // TODO: Sauvegarder dans Supabase
            // Voir le code commenté dans le fichier précédent

            // Rediriger vers la page principale
            router.push('/capture');
        } catch (error) {
            console.error('❌ Erreur finalisation:', error);
            setError('Erreur lors de la sauvegarde');
            setIsConnecting(false);
        }
    };

    const handleBack = () => {
        router.push('/onboarding/step3');
    };

    return (
        <div className="min-h-screen bg-mint flex items-start justify-center p-6 pt-12">
            <div className="w-full max-w-md">

                {/* Header */}
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-secondary tracking-tight font-quicksand">
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
                        Synchronisation Agenda 📅
                    </h2>
                    <p className="text-base text-text-medium mb-8 leading-relaxed">
                        Connecte ton Google Calendar pour des suggestions encore plus précises.
                    </p>

                    {/* Erreur */}
                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Google Calendar Card */}
                    <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border-2 border-border">
                        {/* Logo Google Calendar */}
                        <div className="flex justify-center mb-4">
                            <svg className="w-16 h-16" viewBox="0 0 48 48" fill="none">
                                <rect width="48" height="48" rx="8" fill="#4285F4" />
                                <path d="M28 24h8v8h-8v-8zm-4-4h8v8h-8v-8zm-4 0h8v8h-8v-8zm-4 4h8v8h-8v-8z" fill="white" />
                                <path d="M14 14h20v6H14v-6z" fill="#EA4335" />
                                <path d="M14 20h6v14h-6V20z" fill="#FBBC04" />
                                <path d="M34 20h6v14h-6V20z" fill="#34A853" />
                            </svg>
                        </div>

                        <h3 className="text-lg font-semibold text-text-dark text-center mb-3">
                            Google Agenda
                        </h3>

                        <p className="text-sm text-text-medium text-center mb-4 leading-relaxed">
                            Manae combinera ton agenda <strong>ET</strong> tes indisponibilités
                            pour te proposer les meilleurs créneaux.
                        </p>

                        <div className="bg-mint rounded-lg p-3 mb-6">
                            <p className="text-sm text-text-medium text-center">
                                🔒 Tes données restent privées
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={handleConnectGoogle}
                            disabled={isConnecting}
                            className="w-full mb-3"
                        >
                            {isConnecting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Connexion en cours...
                                </>
                            ) : (
                                <>🔵 Connecter mon compte</>
                            )}
                        </Button>
                    </div>

                    {/* Explications */}
                    <div className="bg-white rounded-2xl p-6 mb-6 border-2 border-border">
                        <h4 className="font-semibold text-text-dark mb-3 flex items-center gap-2">
                            💡 Pourquoi connecter mon agenda ?
                        </h4>
                        <ul className="space-y-2 text-sm text-text-medium mb-4">
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">✓</span>
                                <span>Suggestions ultra-précises basées sur tes vrais créneaux libres</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">✓</span>
                                <span>Évite automatiquement les conflits avec tes RDV</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">✓</span>
                                <span>Planification intelligente qui s'adapte à ton emploi du temps réel</span>
                            </li>
                        </ul>

                        <div className="border-t border-border pt-4">
                            <h4 className="font-semibold text-text-dark mb-2 flex items-center gap-2">
                                🔒 Sécurité & Confidentialité
                            </h4>
                            <p className="text-sm text-text-medium leading-relaxed">
                                Manae accède uniquement à tes <strong>disponibilités</strong>
                                (dates et heures). Le contenu de tes événements reste privé.
                            </p>
                        </div>
                    </div>

                    {/* Boutons navigation */}
                    <div className="space-y-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleSkip}
                            disabled={isConnecting}
                            className="w-full"
                        >
                            Je le ferai plus tard
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleBack}
                            disabled={isConnecting}
                            className="w-full"
                        >
                            ← Retour
                        </Button>
                    </div>
                </main>
            </div>
        </div>
    );
}