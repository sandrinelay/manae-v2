import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route: Nettoyage automatique RGPD (Cron Job)
 *
 * Exécuté quotidiennement, ce job :
 * 1. Supprime les items archivés depuis plus d'1 an
 * 2. Supprime les comptes inactifs depuis plus de 2 ans
 *
 * Sécurité : Protégé par CRON_SECRET (Vercel Cron ou appel externe)
 */

const ARCHIVE_RETENTION_DAYS = 365 // 1 an
const INACTIVE_ACCOUNT_DAYS = 730 // 2 ans

export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier le secret (protection contre appels non autorisés)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // En production, vérifier le secret
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret) {
        console.error('[cron/cleanup] CRON_SECRET non configuré')
        return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[cron/cleanup] Secret invalide')
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    // 2. Créer client Supabase admin
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[cron/cleanup] Variables d\'environnement manquantes')
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const results = {
      archivedItemsDeleted: 0,
      inactiveAccountsDeleted: 0,
      errors: [] as string[]
    }

    // 3. Supprimer les items archivés depuis plus d'1 an
    const archiveDate = new Date()
    archiveDate.setDate(archiveDate.getDate() - ARCHIVE_RETENTION_DAYS)

    const { data: archivedItems, error: archiveError } = await supabase
      .from('items')
      .delete()
      .eq('state', 'archived')
      .lt('updated_at', archiveDate.toISOString())
      .select('id')

    if (archiveError) {
      console.error('[cron/cleanup] Erreur suppression items archivés:', archiveError)
      results.errors.push('Erreur suppression items archivés')
    } else {
      results.archivedItemsDeleted = archivedItems?.length || 0
      console.log(`[cron/cleanup] ${results.archivedItemsDeleted} items archivés supprimés`)
    }

    // 4. Trouver et supprimer les comptes inactifs depuis plus de 2 ans
    const inactiveDate = new Date()
    inactiveDate.setDate(inactiveDate.getDate() - INACTIVE_ACCOUNT_DAYS)

    // Récupérer les users inactifs (dernière connexion > 2 ans)
    const { data: inactiveUsers, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('[cron/cleanup] Erreur récupération users:', usersError)
      results.errors.push('Erreur récupération users')
    } else {
      // Filtrer les users inactifs
      const usersToDelete = inactiveUsers.users.filter(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null
        const createdAt = new Date(user.created_at)

        // Si jamais connecté, utiliser la date de création
        const lastActivity = lastSignIn || createdAt

        return lastActivity < inactiveDate
      })

      // Supprimer chaque compte inactif
      for (const user of usersToDelete) {
        try {
          // Supprimer les données utilisateur
          await supabase.from('items').delete().eq('user_id', user.id)
          await supabase.from('constraints').delete().eq('user_id', user.id)
          await supabase.from('shopping_lists').delete().eq('user_id', user.id)
          await supabase.from('users').delete().eq('id', user.id)
          await supabase.from('ai_usage').delete().eq('user_id', user.id)

          // Supprimer le compte auth
          await supabase.auth.admin.deleteUser(user.id)

          results.inactiveAccountsDeleted++
          console.log(`[cron/cleanup] Compte inactif supprimé: ${user.id}`)
        } catch (err) {
          console.error(`[cron/cleanup] Erreur suppression compte ${user.id}:`, err)
          results.errors.push(`Erreur suppression compte ${user.id}`)
        }
      }
    }

    // 5. Log et retour
    console.log('[cron/cleanup] Nettoyage terminé:', results)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('[cron/cleanup] Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage' },
      { status: 500 }
    )
  }
}
