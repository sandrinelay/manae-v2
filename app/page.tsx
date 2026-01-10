'use client';

import React, { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

// Helper pour lire localStorage de manière synchrone avec useSyncExternalStore
function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getOnboardingSnapshot() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('manae_onboarding');
  return data ? JSON.parse(data) : null;
}

function getServerSnapshot() {
  return null;
}

export default function Dashboard() {
  const router = useRouter();

  // Utiliser useSyncExternalStore pour lire localStorage sans setState dans useEffect
  const onboardingData = useSyncExternalStore(
    subscribeToStorage,
    getOnboardingSnapshot,
    getServerSnapshot
  );

  const onboardingStep = onboardingData?.step || 0;
  const userName = onboardingData?.name || '';
  const isLoading = false; // Plus besoin de loading, useSyncExternalStore est synchrone

  const handleContinueOnboarding = () => {
    if (onboardingStep === 0) {
      router.push('/onboarding');
    } else if (onboardingStep < 3) {
      router.push(`/onboarding/step${onboardingStep + 1}`);
    } else {
      // Onboarding terminé, aller vers capture
      router.push('/capture');
    }
  };

  const handleReset = () => {
    if (confirm('Voulez-vous vraiment recommencer l\'onboarding ?')) {
      localStorage.removeItem('manae_onboarding');
      localStorage.removeItem('manae_google_tokens');
      router.push('/onboarding');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-secondary tracking-tight" style={{ fontFamily: 'var(--font-quicksand)' }}>
            manae
          </h1>
        </header>

        <main>
          {onboardingStep >= 3 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-text-dark mb-2">
                Bonjour {userName} !
              </h2>
              <p className="text-text-medium mb-6">
                Ton espace est prêt. Je suis là pour t&apos;aider à gérer ton temps.
              </p>
              <div className="space-y-3">
                <Button onClick={() => alert('Fonctionnalité à venir !')}>
                  Voir mes tâches
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Recommencer l&apos;intro
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="text-4xl mb-4">👋</div>
              <h2 className="text-2xl font-bold text-text-dark mb-2">
                Bienvenue sur Manae
              </h2>
              <p className="text-text-medium mb-6">
                {onboardingStep > 0
                  ? "On dirait que tu n'as pas terminé ton installation."
                  : "Commençons par faire connaissance pour personnaliser ton expérience."}
              </p>
              <Button onClick={handleContinueOnboarding}>
                {onboardingStep > 0 ? 'Reprendre' : 'Commencer'}
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
