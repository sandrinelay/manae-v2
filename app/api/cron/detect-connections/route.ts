import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { connectionsService } from '@/services/connections.service'

/**
 * API Route: Détection quotidienne de connexions thématiques (Cron Job)
 *
 * Exécuté à 7h00 UTC via Vercel Cron.
 * Itère sur les users actifs dans les 7 derniers jours.
 *
 * Sécurité : Protégé par CRON_SECRET
 */

const ACTIVE_THRESHOLD_DAYS = 7

export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier le secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret) {
        console.error('[cron/detect-connections] CRON_SECRET non configuré')
        return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[cron/detect-connections] Secret invalide')
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    // 2. Créer client Supabase admin
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[cron/detect-connections] Variables d\'environnement manquantes')
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 3. Récupérer les users actifs dans les 7 derniers jours
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - ACTIVE_THRESHOLD_DAYS)

    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('[cron/detect-connections] Erreur récupération users:', usersError)
      return NextResponse.json({ error: 'Erreur récupération users' }, { status: 500 })
    }

    // En dev : traiter tous les users (last_sign_in_at souvent null/ancien sur les comptes de test)
    const activeUsers = process.env.NODE_ENV === 'production'
      ? allUsers.users.filter(user => {
          const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null
          return lastSignIn && lastSignIn >= thresholdDate
        })
      : allUsers.users

    console.log(`[cron/detect-connections] ${activeUsers.length} users actifs à traiter`)

    // 4. Traiter chaque user
    let processed = 0
    const errors: string[] = []

    for (const user of activeUsers) {
      try {
        await connectionsService.detectConnectionForUser(supabase, user.id)
        processed++
      } catch (err) {
        console.error(`[cron/detect-connections] Erreur user ${user.id}:`, err)
        errors.push(`Erreur user ${user.id}`)
      }
    }

    console.log(`[cron/detect-connections] Terminé: ${processed}/${activeUsers.length} traités`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: { usersProcessed: processed, usersTotal: activeUsers.length, errors }
    })

  } catch (error) {
    console.error('[cron/detect-connections] Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la détection de connexions' },
      { status: 500 }
    )
  }
}
