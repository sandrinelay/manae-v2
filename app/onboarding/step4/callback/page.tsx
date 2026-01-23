'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleCallbackContent() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        console.log('[GoogleCallback] Code:', code, 'Error:', error, 'Has opener:', !!window.opener);

        if (window.opener) {
            if (code) {
                console.log('[GoogleCallback] Sending success message to opener');
                // Envoyer le code à la fenêtre parente
                window.opener.postMessage(
                    { type: 'GOOGLE_AUTH_SUCCESS', code },
                    window.location.origin
                );
                console.log('[GoogleCallback] Closing popup');
                window.close();
            } else if (error) {
                console.log('[GoogleCallback] Sending error message to opener');
                window.opener.postMessage(
                    { type: 'GOOGLE_AUTH_ERROR', error },
                    window.location.origin
                );
                window.close();
            }
        } else {
            console.error('[GoogleCallback] No window.opener found!');
        }
    }, [searchParams]);

    return (
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-medium">Connexion en cours...</p>
        </div>
    );
}

export default function GoogleCallbackPage() {
    return (
        <div className="min-h-screen bg-mint flex items-center justify-center p-6">
            <Suspense fallback={
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-text-medium">Chargement...</p>
                </div>
            }>
                <GoogleCallbackContent />
            </Suspense>
        </div>
    );
}