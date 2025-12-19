// services/quota/quota.service.ts

import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

export interface QuotaCheckResult {
  canUse: boolean
  creditsRemaining: number | null // null = illimité
  quotaExceeded: boolean
  planId: 'essential' | 'plus' | 'family'
}

export interface UserSubscription {
  userId: string
  planId: 'essential' | 'plus' | 'family'
  aiQuotaWeekly: number | null
  aiUsedThisWeek: number
  weekResetDate: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

export type AIOperation = 'analyze' | 'develop_idea' | 'suggest_time'

// Coût en crédits par opération
const AI_OPERATION_COSTS: Record<AIOperation, number> = {
  analyze: 1,
  develop_idea: 2,
  suggest_time: 1
}

// ============================================
// CHECK QUOTA
// ============================================

/**
 * Vérifie si l'utilisateur peut utiliser l'IA
 * Utilise la fonction Postgres check_ai_quota()
 */
export async function checkAIQuota(userId: string): Promise<QuotaCheckResult> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('check_ai_quota', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error checking AI quota:', error)
    throw error
  }

  return {
    canUse: data.can_use,
    creditsRemaining: data.credits_remaining,
    quotaExceeded: data.quota_exceeded,
    planId: data.plan_id
  }
}

// ============================================
// TRACK USAGE
// ============================================

/**
 * Enregistre l'utilisation de l'IA
 * Utilise la fonction Postgres track_ai_usage()
 */
export async function trackAIUsage(
  userId: string,
  operation: AIOperation,
  itemId?: string
): Promise<void> {
  const supabase = createClient()
  const cost = AI_OPERATION_COSTS[operation]

  const { error } = await supabase.rpc('track_ai_usage', {
    p_user_id: userId,
    p_operation: operation,
    p_cost_credits: cost,
    p_item_id: itemId || null
  })

  if (error) {
    console.error('Error tracking AI usage:', error)
    throw error
  }
}

// ============================================
// GET SUBSCRIPTION
// ============================================

/**
 * Récupère les infos d'abonnement de l'utilisateur
 */
export async function getUserSubscription(
  userId: string
): Promise<UserSubscription | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Pas de subscription trouvée
      return null
    }
    console.error('Error fetching user subscription:', error)
    throw error
  }

  return {
    userId: data.user_id,
    planId: data.plan_id,
    aiQuotaWeekly: data.ai_quota_weekly,
    aiUsedThisWeek: data.ai_used_this_week,
    weekResetDate: data.week_reset_date,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id
  }
}

// ============================================
// GET SUBSCRIPTION PLANS
// ============================================

export interface SubscriptionPlan {
  id: string
  name: string
  aiQuotaWeekly: number | null
  priceMonthly: number
  stripePriceId?: string
  features: string[]
}

/**
 * Récupère tous les plans d'abonnement disponibles
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly', { ascending: true })

  if (error) {
    console.error('Error fetching subscription plans:', error)
    throw error
  }

  return data.map(plan => ({
    id: plan.id,
    name: plan.name,
    aiQuotaWeekly: plan.ai_quota_weekly,
    priceMonthly: plan.price_monthly,
    stripePriceId: plan.stripe_price_id,
    features: plan.features
  }))
}

// ============================================
// GET AI USAGE HISTORY
// ============================================

export interface AIUsageRecord {
  id: string
  operation: AIOperation
  costCredits: number
  itemId?: string
  createdAt: string
}

/**
 * Récupère l'historique d'utilisation IA de l'utilisateur
 */
export async function getAIUsageHistory(
  userId: string,
  limit: number = 50
): Promise<AIUsageRecord[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching AI usage history:', error)
    throw error
  }

  return data.map(record => ({
    id: record.id,
    operation: record.operation as AIOperation,
    costCredits: record.cost_credits,
    itemId: record.item_id,
    createdAt: record.created_at
  }))
}

// ============================================
// HELPER : Format credits display
// ============================================

/**
 * Formate l'affichage des crédits pour l'UI
 */
export function formatCreditsDisplay(
  creditsRemaining: number | null,
  quota: number | null
): string {
  if (creditsRemaining === null || quota === null) {
    return 'Illimité'
  }
  return `${creditsRemaining}/${quota}`
}
