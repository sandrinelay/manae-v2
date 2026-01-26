export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = async (
  error: { digest: string } & Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string }
  },
  context: { routerKind: string; routeType: string; routePath: string }
) => {
  // Import dynamique pour éviter les problèmes de bundle
  const Sentry = await import('@sentry/nextjs')

  Sentry.captureException(error, {
    extra: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routeType: context.routeType,
      routePath: context.routePath,
    },
  })
}
