'use client';

import { usePathname } from "next/navigation";

export default function OnboardingHeader() {
    const pathname = usePathname()

    const stepNumber = pathname === '/onboarding/step1' ? 1
        : pathname === '/onboarding/step2' ? 2
        : pathname === '/onboarding/step3' ? 3
        : 0;
    const totalSteps = 3;

    // Ne pas afficher le header sur la page de redirect
    if (stepNumber === 0) return null;

    return (
        <>
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-quicksand)', color: '#333538' }}>
                manae
            </h1>

            <span className="text-sm font-medium text-text-muted bg-white px-3 py-1 rounded-full">
                Étape {stepNumber} / {totalSteps}
            </span>
        </header>

        <div className="w-full h-1 bg-gray-light rounded-full mb-8 overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            />
        </div>
        </>
    );
}
