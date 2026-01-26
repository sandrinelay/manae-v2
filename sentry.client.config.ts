import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% des transactions (suffisant pour beta)

  // Session replay (optionnel, désactivé pour l'instant)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Environnement
  environment: process.env.NODE_ENV,

  // Ne pas envoyer en dev local
  enabled: process.env.NODE_ENV === 'production',

  // Ignorer certaines erreurs communes non critiques
  ignoreErrors: [
    // Erreurs réseau courantes
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // Erreurs de navigation
    'ResizeObserver loop',
    // Erreurs d'extensions navigateur
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
  ],

  // Filtrer les breadcrumbs pour réduire le bruit
  beforeBreadcrumb(breadcrumb) {
    // Ignorer les XHR vers Supabase auth (sensible)
    if (breadcrumb.category === 'xhr' && breadcrumb.data?.url?.includes('supabase')) {
      return null
    }
    return breadcrumb
  },
})
