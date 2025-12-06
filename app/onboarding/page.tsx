'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OnboardingData, ValidationErrors } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingStep1() {
    const router = useRouter();

    // Simuler les données du sign up (à remplacer par les vraies données plus tard)
    const signUpData = {
        firstName: 'Lena',
        lastName: 'Martin',
        email: 'lena.martin@example.com'
    };

    const [formData, setFormData] = useState<OnboardingData>({
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        email: signUpData.email
    });

    const [touched, setTouched] = useState<{ [key in keyof OnboardingData]?: boolean }>({});
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isValid, setIsValid] = useState(true);

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

        if (!formData.email.trim()) {
            newErrors.email = "L'email est requis";
            valid = false;
        } else if (!EMAIL_REGEX.test(formData.email)) {
            newErrors.email = "L'email n'est pas valide";
            valid = false;
        }

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        const payload = {
            step: 1,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            completed_at: new Date().toISOString()
        };

        try {
            localStorage.setItem('manae_onboarding', JSON.stringify(payload));
            console.log('✅ Données sauvegardées:', payload);
            router.push('/onboarding/step2');
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
        }
    };

    return (
        <div className="min-h-screen bg-mint flex items-start justify-center p-6 pt-12">
            <div className="w-full max-w-md">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-secondary tracking-tight" style={{ fontFamily: 'var(--font-quicksand)' }}>
                        manae
                    </h1>
                    <span className="text-sm font-medium text-text-muted bg-white px-3 py-1 rounded-full">
                        Étape 1 / 4
                    </span>
                </header>

                <div className="w-full h-1 bg-gray-light rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary via-secondary to-primary"
                        style={{ width: '25%' }}
                    />
                </div>

                <main>
                    <h2 className="text-2xl font-bold text-text-dark mb-3">
                        Faisons connaissance 👋
                    </h2>
                    <p className="text-base text-text-medium mb-8 leading-relaxed">
                        Quelques infos pour personnaliser ton expérience.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-2">
                        <Input
                            id="firstName"
                            name="firstName"
                            label="PRÉNOM"
                            placeholder="Ex: Sandrine"
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
                            💡 L'email ne peut pas être modifié
                        </p>

                        <div className="pt-4">
                            <Button type="submit" disabled={!isValid}>
                                Continuer →
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}