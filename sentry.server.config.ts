import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Environnement
  environment: process.env.NODE_ENV,

  // Ne pas envoyer en dev local
  enabled: process.env.NODE_ENV === 'production',

  // Ignorer certaines erreurs
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
})
