'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OnboardingData, ValidationErrors } from '@/types';
import { getOrCreateUserProfile, updateUserProfile } from '@/services/supabaseService';

export default function OnboardingStep1() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState<OnboardingData>({
        firstName: '',
        lastName: '',
        email: ''
    });

    // Charger le profil utilisateur existant
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await getOrCreateUserProfile();
                setFormData({
                    firstName: profile.first_name || '',
                    lastName: profile.last_name || '',
                    email: profile.email || ''
                });
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

    const [touched, setTouched] = useState<{ [key in keyof OnboardingData]?: boolean }>({});
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const newErrors: ValidationErrors = {};
        let valid = true;

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Le prénom est requis';
            valid = false;
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Le nom est requis';
            valid = false;
        }

        // L'email est pré-rempli depuis Supabase Auth et désactivé
        // On ne valide que prénom et nom (l'email est toujours valide car il vient de l'auth)

        setErrors(newErrors);
        setIsValid(valid);
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || isSaving) return;

        setIsSaving(true);

        try {
            // Sauvegarder vers Supabase
            await updateUserProfile({
                first_name: formData.firstName,
                last_name: formData.lastName
            });

            // Garder aussi en localStorage pour le flow onboarding
            const payload = {
                step: 1,
                currentStep: 2,
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                completed_at: new Date().toISOString()
            };
            localStorage.setItem('manae_onboarding', JSON.stringify(payload));

            console.log('Saved to Supabase and localStorage');
            router.push('/onboarding/step2');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Erreur lors de la sauvegarde');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-mint flex items-start justify-center">
            <div className="w-full max-w-md">
 

                <main>
                    <h2 className="text-2xl font-bold text-text-dark mb-3">
                        Faisons connaissance
                    </h2>
                    <p className="text-base text-text-medium mb-8 leading-relaxed">
                        Quelques infos pour personnaliser ton expérience.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-2">
                        <Input
                            id="firstName"
                            name="firstName"
                            label="PRÉNOM"
                            placeholder="Ex: Lena"
                            value={formData.firstName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={touched.firstName ? errors.firstName : undefined}
                        />

                        <Input
                            id="lastName"
                            name="lastName"
                            label="NOM"
                            placeholder="Ex: Martin"
                            value={formData.lastName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={touched.lastName ? errors.lastName : undefined}
                        />

                        <Input
                            id="email"
                            name="email"
                            type="email"
                            label="EMAIL"
                            placeholder="sandrine.martin@example.com"
                            value={formData.email}
                            disabled
                            className="opacity-70"
                        />

                        <p className="text-xs text-text-muted mb-6 mt-2">
                            💡 L&apos;email ne peut pas être modifié
                        </p>

                        <div className="pt-4">
                            <Button type="submit" disabled={!isValid || isSaving || isLoading}>
                                {isSaving ? 'Sauvegarde...' : 'Continuer →'}
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}