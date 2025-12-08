const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Scopes pour lire ET écrire dans le calendrier
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
].join(' ');

/**
 * Ouvrir la popup d'autorisation Google
 */
export const openGoogleAuthPopup = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        // URL d'autorisation Google
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID || '');
        authUrl.searchParams.append('redirect_uri', `${window.location.origin}/onboarding/step4/callback`);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', SCOPES);
        authUrl.searchParams.append('access_type', 'offline');
        authUrl.searchParams.append('prompt', 'consent');

        // Ouvrir la popup
        const popup = window.open(
            authUrl.toString(),
            'Google Auth',
            `width=${width},height=${height},top=${top},left=${left}`
        );

        if (!popup) {
            reject(new Error('Popup bloquée par le navigateur'));
            return;
        }

        // Écouter les messages de la popup
        const handleMessage = (event: MessageEvent) => {
            // Vérifier l'origine
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                window.removeEventListener('message', handleMessage);
                resolve(event.data.code);
            } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
                window.removeEventListener('message', handleMessage);
                reject(new Error(event.data.error));
            }
        };

        window.addEventListener('message', handleMessage);

        // Timeout de 5 minutes
        setTimeout(() => {
            if (popup && !popup.closed) {
                popup.close();
                window.removeEventListener('message', handleMessage);
                reject(new Error('Timeout'));
            }
        }, 5 * 60 * 1000);
    });
};

/**
 * Échanger le code contre un token via notre API route sécurisée
 * Le client_secret reste côté serveur
 */
export const exchangeCodeForToken = async (code: string) => {
    const redirectUri = `${window.location.origin}/onboarding/step4/callback`;

    const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            redirect_uri: redirectUri
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to exchange code for token');
    }

    return await response.json();
};