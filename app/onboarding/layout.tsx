'use client';

import OnboardingHeader from "@/components/onboarding/header";


export default function OnboardingLayout({ children }: { children: React.ReactNode }) {

    return (
        <div className="min-h-screen bg-mint flex items-start justify-center p-6 pt-12">
            <div className="w-full max-w-md  p-6 ">
                <OnboardingHeader />
                {children}
            </div>
        </div>
    );
}   