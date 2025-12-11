import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    // 1. Vérifier auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Récupérer les données
    const { itemId, updates } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // 3. Filtrer les champs autorisés
    const allowedFields = [
      'text',
      'refined_text',
      'type',
      'status',
      'category',
      'priority',
      'deadline',
      'suggested_slot',
      'planned_date',
      'completed_date',
      'project_steps',
      'project_budget',
      'project_time',
      'project_motivation',
      'parent_project_id'
    ]

    const filteredUpdates: Record<string, unknown> = {}
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
    }

    // 4. Ajouter updated_at
    filteredUpdates.updated_at = new Date().toISOString()

    // 5. Si status passe à completed, ajouter completed_date
    if (filteredUpdates.status === 'completed') {
      filteredUpdates.completed_date = new Date().toISOString()
    }

    // 6. Mettre à jour l'item
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update(filteredUpdates)
      .eq('id', itemId)
      .eq('user_id', user.id) // Sécurité : s'assurer que l'item appartient à l'utilisateur
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      throw updateError
    }

    return NextResponse.json({ item: updatedItem })

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Update item error:', error)
    return NextResponse.json(
      { error: err.message || 'Failed to update item' },
      { status: 500 }
    )
  }
}
