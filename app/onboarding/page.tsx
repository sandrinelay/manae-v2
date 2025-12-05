'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OnboardingData, ValidationErrors } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingStep1() {
    // Simuler les données du sign up (à remplacer par les vraies données plus tard)
    const signUpData = {
        firstName: 'Sandrine', // Viendra de Supabase après sign up
        lastName: 'Martin',     // Viendra de Supabase après sign up
        email: 'sandrine.martin@example.com' // Viendra de Supabase après sign up
    };

    const [formData, setFormData] = useState<OnboardingData>({
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        email: signUpData.email
    });

    const [touched, setTouched] = useState<{ [key in keyof OnboardingData]?: boolean }>({});
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isValid, setIsValid] = useState(true); // true par défaut car données du sign up

    // Validation
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

            // TODO: Rediriger vers /onboarding/step2
            alert('Données sauvegardées ! Prochaine étape : Moments d\'énergie ⚡');
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#FEFDFB] flex items-center justify-center p-6">
            <div className="w-full max-w-md">

                {/* Header */}
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-[#BC8A7F] tracking-tight font-quicksand">
                        manae
                    </h1>
                    <span className="text-sm font-medium text-[#A89F91] bg-[#FFF8F0] px-3 py-1 rounded-full">
                        Étape 1 / 4
                    </span>
                </header>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-[#F9FAFB] rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#BC8A7F] via-[#A89F91] to-[#BC8A7F]"
                        style={{ width: '25%' }}
                    />
                </div>

                {/* Content */}
                <main>
                    <h2 className="text-2xl font-bold text-[#443C38] mb-3">
                        Faisons connaissance 👋
                    </h2>
                    <p className="text-base text-[#6B625E] mb-8 leading-relaxed">
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

                        <p className="text-xs text-[#A89F91] mb-6 mt-2">
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