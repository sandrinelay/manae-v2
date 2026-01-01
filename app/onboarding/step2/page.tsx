'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EnergyCard } from '@/components/ui/EnergyCard';
import { SunriseIcon, CoffeeIcon, BriefcaseIcon, SunsetIcon, MoonIcon } from '@/components/ui/icons';
import { updateUserProfile, getOrCreateUserProfile } from '@/services/supabaseService';


interface EnergyMoment {
    id: string;
    icon: React.FC<{ className?: string }>;
    label: string;
    timeRange: string;
}

const ENERGY_MOMENTS: EnergyMoment[] = [
    { id: 'morning-energy', icon: SunriseIcon, label: 'Matin énergétique', timeRange: '6h-9h' },
    { id: 'morning', icon: SunriseIcon, label: 'Matinée', timeRange: '9h-12h' },
    { id: 'lunch', icon: CoffeeIcon, label: 'Pause midi', timeRange: '12h-14h' },
    { id: 'afternoon', icon: BriefcaseIcon, label: 'Après-midi', timeRange: '14h-18h' },
    { id: 'evening', icon: SunsetIcon, label: 'Fin de journée', timeRange: '18h-21h' },
    { id: 'night', icon: MoonIcon, label: 'Nuit', timeRange: '21h-6h' },
];

export default function OnboardingStep2() {
    const router = useRouter();
    const [selectedMoments, setSelectedMoments] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Charger les energy_moments existants
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await getOrCreateUserProfile();
                if (profile.energy_moments) {
                    setSelectedMoments(profile.energy_moments);
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

    const toggleMoment = (id: string) => {
        setSelectedMoments(prev =>
            prev.includes(id)
                ? prev.filter(m => m !== id)
                : [...prev, id]
        );
    };

    const handleBack = () => {
        router.push('/onboarding');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedMoments.length === 0 || isSaving) return;

        setIsSaving(true);

        try {
            // Sauvegarder vers Supabase
            await updateUserProfile({
                energy_moments: selectedMoments
            });

            // Garder aussi en localStorage pour le flow
            const existingData = localStorage.getItem('manae_onboarding');
            const parsedData = existingData ? JSON.parse(existingData) : {};
            const payload = {
                ...parsedData,
                step: 2,
                energy_moments: selectedMoments,
                completed_at: new Date().toISOString()
            };
            localStorage.setItem('manae_onboarding', JSON.stringify(payload));

            console.log('Saved to Supabase and localStorage');
            router.push('/onboarding/step3');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erreur lors de la sauvegarde');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-mint flex items-start justify-center">
            <div className="w-full max-w-md">


                {/* Content */}
                <main>
                    <h2 className="text-2xl font-bold text-text-dark mb-3">
                        Tes moments d&apos;énergie
                    </h2>
                    <p className="text-base text-text-medium mb-6 leading-relaxed">
                        Quand préfères-tu avancer sur tes tâches ?
                    </p>

                    <form onSubmit={handleSubmit}>
                        {/* Grid de cards */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {ENERGY_MOMENTS.map(moment => (
                                <EnergyCard
                                    key={moment.id}
                                    id={moment.id}
                                    icon={moment.icon}
                                    label={moment.label}
                                    timeRange={moment.timeRange}
                                    selected={selectedMoments.includes(moment.id)}
                                    onClick={() => toggleMoment(moment.id)}
                                />
                            ))}
                        </div>

                        {/* Message d'aide si rien sélectionné */}
                        {selectedMoments.length === 0 && (
                            <p className="text-sm text-text-muted text-center mb-6">
                                💡 Sélectionne au moins un créneau
                            </p>
                        )}

                        {/* Boutons navigation */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleBack}
                                className="flex-1"
                            >
                                ← Retour
                            </Button>
                            <Button
                                type="submit"
                                disabled={selectedMoments.length === 0 || isSaving || isLoading}
                                className="flex-1"
                            >
                                {isSaving ? 'Sauvegarde...' : 'Continuer →'}
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}