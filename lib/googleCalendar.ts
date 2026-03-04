const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Scopes Google Calendar utilisés :
// - calendar.events : lecture + création/modification/suppression des événements
// - calendar.calendarlist.readonly : lecture de la liste des calendriers de l'utilisateur
//   (nécessaire pour CalendarSelectorModal et la vue agenda)
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
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

        // Générer un state aléatoire pour protection CSRF
        const state = crypto.randomUUID();
        document.cookie = `google_oauth_state=${state}; path=/; max-age=600; samesite=lax`;

        // URL d'autorisation Google
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID || '');
        authUrl.searchParams.append('redirect_uri', `${window.location.origin}/auth/google/callback`);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', SCOPES);
        authUrl.searchParams.append('access_type', 'offline');
        authUrl.searchParams.append('prompt', 'consent');
        authUrl.searchParams.append('state', state);

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
                // Vérifier le state pour protection CSRF
                const storedState = document.cookie.match(/google_oauth_state=([^;]+)/)?.[1];
                document.cookie = 'google_oauth_state=; path=/; max-age=0';
                if (!storedState || event.data.state !== storedState) {
                    window.removeEventListener('message', handleMessage);
                    reject(new Error('Requête invalide (state mismatch)'));
                    return;
                }
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
    const redirectUri = `${window.location.origin}/auth/google/callback`;

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