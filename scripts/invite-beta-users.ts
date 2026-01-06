/**
 * Script d'invitation des utilisateurs beta
 *
 * Ce script récupère les emails de la waitlist et envoie des invitations
 * via Supabase Auth.
 *
 * Usage:
 *   npx tsx scripts/invite-beta-users.ts
 *
 * Options:
 *   --dry-run    Affiche les emails sans envoyer d'invitations
 *   --limit=N    Limite le nombre d'invitations (défaut: 10)
 *   --email=X    Invite un email spécifique
 *
 * Prérequis:
 *   - Variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 *   - Table 'waitlist' avec colonne 'email' et optionnellement 'invited_at'
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Charger les variables d'environnement depuis .env.local
config({ path: '.env.local' })

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.manae.app'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Client admin Supabase (avec service role key)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Parser les arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const emailArg = args.find(arg => arg.startsWith('--email='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10
const specificEmail = emailArg ? emailArg.split('=')[1] : null

interface WaitlistUser {
  id: string
  email: string
  created_at: string
  invited_at: string | null
}

async function getWaitlistUsers(): Promise<WaitlistUser[]> {
  if (specificEmail) {
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('email', specificEmail)
      .single()

    if (error) {
      console.error(`❌ Email non trouvé dans la waitlist: ${specificEmail}`)
      return []
    }

    return [data]
  }

  // Récupérer les utilisateurs non encore invités
  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .is('invited_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('❌ Erreur récupération waitlist:', error.message)
    return []
  }

  return data || []
}

async function inviteUser(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${APP_URL}/set-password`
      }
    )

    if (error) {
      // Si l'utilisateur existe déjà, on considère comme succès
      if (error.message.includes('already been registered')) {
        console.log(`   ⚠️  ${email} - Déjà inscrit`)
        return true
      }
      console.error(`   ❌ ${email} - Erreur: ${error.message}`)
      return false
    }

    console.log(`   ✅ ${email} - Invitation envoyée`)
    return true
  } catch (err) {
    console.error(`   ❌ ${email} - Exception:`, err)
    return false
  }
}

async function markAsInvited(id: string): Promise<void> {
  await supabaseAdmin
    .from('waitlist')
    .update({ invited_at: new Date().toISOString() })
    .eq('id', id)
}

async function main() {
  console.log('')
  console.log('🚀 Script d\'invitation beta Manae')
  console.log('================================')
  console.log('')

  if (isDryRun) {
    console.log('⚠️  Mode DRY RUN - Aucune invitation ne sera envoyée')
    console.log('')
  }

  // Récupérer les utilisateurs
  const users = await getWaitlistUsers()

  if (users.length === 0) {
    console.log('ℹ️  Aucun utilisateur à inviter')
    return
  }

  console.log(`📋 ${users.length} utilisateur(s) à inviter:`)
  console.log('')

  let successCount = 0
  let errorCount = 0

  for (const user of users) {
    if (isDryRun) {
      console.log(`   📧 ${user.email} (inscrit le ${new Date(user.created_at).toLocaleDateString('fr-FR')})`)
      successCount++
    } else {
      const success = await inviteUser(user.email)

      if (success) {
        await markAsInvited(user.id)
        successCount++
      } else {
        errorCount++
      }

      // Pause entre les invitations pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log('')
  console.log('================================')
  console.log(`✅ Succès: ${successCount}`)
  if (errorCount > 0) {
    console.log(`❌ Erreurs: ${errorCount}`)
  }
  console.log('')

  if (isDryRun) {
    console.log('💡 Pour envoyer les invitations, relance sans --dry-run')
  }
}

main().catch(console.error)
