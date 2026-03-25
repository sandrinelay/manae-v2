import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScheduleException } from '@/types'

export const scheduleExceptionsService = {
  async getExceptions(
    supabase: SupabaseClient,
    userId: string
  ): Promise<ScheduleException[]> {
    const { data, error } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true })

    if (error) throw new Error(`Erreur chargement exceptions: ${error.message}`)
    return data ?? []
  },

  async createException(
    supabase: SupabaseClient,
    userId: string,
    exception: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>
  ): Promise<ScheduleException> {
    const { data, error } = await supabase
      .from('schedule_exceptions')
      .insert({ ...exception, user_id: userId })
      .select()
      .single()

    if (error) throw new Error(`Erreur création exception: ${error.message}`)
    return data
  },

  async deleteException(
    supabase: SupabaseClient,
    id: string
  ): Promise<void> {
    const { error } = await supabase
      .from('schedule_exceptions')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Erreur suppression exception: ${error.message}`)
  }
}
