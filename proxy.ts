import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes publiques (accessibles sans authentification)
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/set-password',
  '/invitation',
  '/offline',
  '/api',
  '/auth/google/callback',
]

// Routes d'authentification (rediriger vers /capture si déjà connecté)
const AUTH_ROUTES = [
  '/login',
  '/signup',
]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Vérifier si c'est une route publique
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // Si non connecté et route protégée → rediriger vers login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    // Sauvegarder la page demandée pour redirection après login
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Si connecté et sur page d'auth → rediriger vers capture
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/capture', request.url))
  }

  // Si connecté, vérifier onboarding
  if (user && !pathname.startsWith('/onboarding')) {
    // Vérifier si l'onboarding est terminé
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    // Si onboarding non terminé, rediriger vers onboarding
    if (profile && !profile.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding/step1', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, images, manifest, sw.js, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
