import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route: Export des données RGPD (Portabilité)
 *
 * Exporte toutes les données utilisateur en JSON :
 * - Profil
 * - Items (tâches, notes, idées, courses)
 * - Contraintes horaires
 * - Listes de courses
 * - Usage IA
 */
export async function GET() {
  try {
    // 1. Vérifier authentification
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = user.id

    // 2. Récupérer toutes les données

    // 2.1 Profil utilisateur
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    // 2.2 Items (tâches, notes, idées, courses)
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // 2.3 Contraintes horaires
    const { data: constraints } = await supabase
      .from('constraints')
      .select('*')
      .eq('user_id', userId)

    // 2.4 Listes de courses
    const { data: shoppingLists } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)

    // 2.5 Usage IA
    const { data: aiUsage } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // 3. Construire l'export
    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        email: user.email,
        format_version: '1.0'
      },
      profile: profile ? {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        energy_moments: profile.energy_moments,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      } : null,
      items: items?.map(item => ({
        id: item.id,
        type: item.type,
        state: item.state,
        content: item.content,
        context: item.context,
        mood: item.mood,
        scheduled_at: item.scheduled_at,
        shopping_category: item.shopping_category,
        ai_analysis: item.ai_analysis,
        metadata: item.metadata,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || [],
      constraints: constraints?.map(c => ({
        day_of_week: c.day_of_week,
        start_time: c.start_time,
        end_time: c.end_time,
        type: c.type,
        created_at: c.created_at
      })) || [],
      shopping_lists: shoppingLists?.map(list => ({
        id: list.id,
        name: list.name,
        status: list.status,
        created_at: list.created_at
      })) || [],
      ai_usage_summary: {
        total_operations: aiUsage?.length || 0,
        operations: aiUsage?.slice(0, 100).map(u => ({
          operation: u.operation,
          cost_credits: u.cost_credits,
          created_at: u.created_at
        })) || []
      },
      statistics: {
        total_items: items?.length || 0,
        items_by_type: {
          tasks: items?.filter(i => i.type === 'task').length || 0,
          notes: items?.filter(i => i.type === 'note').length || 0,
          ideas: items?.filter(i => i.type === 'idea').length || 0,
          list_items: items?.filter(i => i.type === 'list_item').length || 0
        },
        items_by_state: {
          active: items?.filter(i => i.state === 'active').length || 0,
          completed: items?.filter(i => i.state === 'completed').length || 0,
          archived: items?.filter(i => i.state === 'archived').length || 0,
          planned: items?.filter(i => i.state === 'planned').length || 0,
          project: items?.filter(i => i.state === 'project').length || 0
        }
      }
    }

    // 4. Retourner le JSON avec headers pour téléchargement
    const filename = `manae-export-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('[account/export] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données' },
      { status: 500 }
    )
  }
}
