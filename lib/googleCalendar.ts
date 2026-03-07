const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Scopes Google Calendar utilisés :
// - calendar.events : lecture + création/modification/suppression des événements
// - calendar.calendarlist.readonly : lecture de la liste des calendriers de l'utilisateur
//   (nécessaire pour CalendarSelectorModal et la vue agenda)
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
].join(' ');

// Génère un code_verifier aléatoire URL-safe (PKCE)
const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

// Génère le code_challenge = BASE64URL(SHA256(code_verifier)) (PKCE)
const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

// Détecte si l'app tourne en mode PWA standalone (popups bloquées)
const isPWA = (): boolean =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Ouvrir l'autorisation Google.
 * - Mode web : popup
 * - Mode PWA : redirect pleine page (popups bloquées en mode standalone)
 */
export const openGoogleAuthPopup = async (): Promise<string> => {
    // PKCE : générer verifier + challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    document.cookie = `google_pkce_verifier=${codeVerifier}; path=/; max-age=600; samesite=lax`;

    // CSRF state
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
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    // En PWA, les popups sont bloquées → redirect pleine page
    // La page de callback gère l'échange de token et redirige vers /capture
    if (isPWA()) {
        window.location.href = authUrl.toString();
        return new Promise(() => { /* la page se redirige, la promise ne résout jamais */ });
    }

    return new Promise((resolve, reject) => {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

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

    // Récupérer et supprimer le code_verifier PKCE
    const codeVerifier = document.cookie.match(/google_pkce_verifier=([^;]+)/)?.[1] ?? '';
    document.cookie = 'google_pkce_verifier=; path=/; max-age=0';

    const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to exchange code for token');
    }

    return await response.json();
};