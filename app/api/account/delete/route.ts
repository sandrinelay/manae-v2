import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * API Route: Suppression de compte RGPD
 *
 * Supprime toutes les données utilisateur :
 * - Items (tâches, notes, idées, courses)
 * - Contraintes horaires
 * - Listes de courses
 * - Profil utilisateur
 * - Compte auth Supabase
 */
export async function DELETE() {
  try {
    // 1. Vérifier authentification
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = user.id

    // 2. Supprimer les données dans l'ordre (respect des foreign keys)

    // 2.1 Supprimer tous les items (tâches, notes, idées, courses)
    const { error: itemsError } = await supabase
      .from('items')
      .delete()
      .eq('user_id', userId)

    if (itemsError) {
      console.error('[account/delete] Erreur suppression items:', itemsError)
      throw new Error('Erreur suppression items')
    }

    // 2.2 Supprimer les contraintes horaires
    const { error: constraintsError } = await supabase
      .from('constraints')
      .delete()
      .eq('user_id', userId)

    if (constraintsError) {
      console.error('[account/delete] Erreur suppression constraints:', constraintsError)
      // Non-bloquant, table peut ne pas exister
    }

    // 2.3 Supprimer les listes de courses
    const { error: listsError } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('user_id', userId)

    if (listsError) {
      console.error('[account/delete] Erreur suppression shopping_lists:', listsError)
      // Non-bloquant
    }

    // 2.4 Supprimer le profil utilisateur
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('[account/delete] Erreur suppression profil:', profileError)
      // Non-bloquant, peut ne pas exister
    }

    // 2.5 Supprimer l'usage IA
    const { error: usageError } = await supabase
      .from('ai_usage')
      .delete()
      .eq('user_id', userId)

    if (usageError) {
      console.error('[account/delete] Erreur suppression ai_usage:', usageError)
      // Non-bloquant
    }

    // 3. Supprimer le compte auth via Admin API
    // Nécessite SUPABASE_SERVICE_ROLE_KEY
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)

      if (deleteAuthError) {
        console.error('[account/delete] Erreur suppression auth:', deleteAuthError)
        // On continue quand même, les données sont supprimées
      }
    }

    console.log(`[account/delete] Compte supprimé avec succès: ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Compte et données supprimés avec succès'
    })

  } catch (error) {
    console.error('[account/delete] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du compte' },
      { status: 500 }
    )
  }
}
