'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function GoogleCallbackPage() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (window.opener) {
            if (code) {
                // Envoyer le code à la fenêtre parente
                window.opener.postMessage(
                    { type: 'GOOGLE_AUTH_SUCCESS', code },
                    window.location.origin
                );
                window.close();
            } else if (error) {
                window.opener.postMessage(
                    { type: 'GOOGLE_AUTH_ERROR', error },
                    window.location.origin
                );
                window.close();
            }
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-mint flex items-center justify-center p-6">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-text-medium">Connexion en cours...</p>
            </div>
        </div>
    );
}