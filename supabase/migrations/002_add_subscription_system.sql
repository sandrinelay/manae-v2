-- ============================================
-- TABLE : subscription_plans
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ai_quota_weekly INT, -- NULL = illimité
  price_monthly DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les 3 plans
INSERT INTO subscription_plans (id, name, ai_quota_weekly, price_monthly, features) VALUES
  (
    'essential',
    'Essentiel',
    10,
    0,
    '["Capture illimitée", "10 analyses IA/semaine", "Notes et tâches", "Liste de courses"]'::jsonb
  ),
  (
    'plus',
    'Plus',
    NULL,
    9.99,
    '["Tout Essentiel", "IA illimitée", "Développement idées", "Planification intelligente", "Google Calendar"]'::jsonb
  ),
  (
    'family',
    'Famille',
    NULL,
    19.99,
    '["Tout Plus", "Jusquà 5 membres", "Partage de tâches", "Calendrier familial"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MODIFIER : user_subscriptions
-- ============================================

-- Ajouter colonnes si elles n'existent pas déjà
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id) DEFAULT 'essential',
  ADD COLUMN IF NOT EXISTS ai_quota_weekly INT,
  ADD COLUMN IF NOT EXISTS ai_used_this_week INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_reset_date DATE;

-- Mettre à jour le quota des users existants selon leur plan
UPDATE user_subscriptions us
SET ai_quota_weekly = sp.ai_quota_weekly
FROM subscription_plans sp
WHERE us.plan_id = sp.id
  AND us.ai_quota_weekly IS NULL;

-- Initialiser la date de reset pour les users existants (prochain lundi)
UPDATE user_subscriptions
SET week_reset_date = (
  DATE_TRUNC('week', NOW() + INTERVAL '7 days')::DATE
)
WHERE week_reset_date IS NULL;

-- ============================================
-- TABLE : ai_usage (historique)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('analyze', 'develop_idea', 'suggest_time')),
  cost_credits INT NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_week ON ai_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_id);

-- ============================================
-- RLS pour ai_usage
-- ============================================
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FONCTION : Vérifier quota disponible
-- ============================================
CREATE OR REPLACE FUNCTION check_ai_quota(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan_id TEXT;
  v_quota INT;
  v_used INT;
  v_reset_date DATE;
BEGIN
  -- Récupérer infos subscription
  SELECT plan_id, ai_quota_weekly, ai_used_this_week, week_reset_date
  INTO v_plan_id, v_quota, v_used, v_reset_date
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  -- Si pas de subscription, retourner quota épuisé
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_use', false,
      'credits_remaining', 0,
      'quota_exceeded', true,
      'plan_id', 'essential'
    );
  END IF;

  -- Si plan Plus ou Famille → illimité
  IF v_plan_id IN ('plus', 'family') THEN
    RETURN jsonb_build_object(
      'can_use', true,
      'credits_remaining', NULL,
      'quota_exceeded', false,
      'plan_id', v_plan_id
    );
  END IF;

  -- Si date de reset dépassée → reset le compteur
  IF v_reset_date IS NOT NULL AND v_reset_date <= CURRENT_DATE THEN
    UPDATE user_subscriptions
    SET ai_used_this_week = 0,
        week_reset_date = DATE_TRUNC('week', NOW() + INTERVAL '7 days')::DATE
    WHERE user_id = p_user_id;

    v_used := 0;
  END IF;

  -- Vérifier quota
  RETURN jsonb_build_object(
    'can_use', v_used < v_quota,
    'credits_remaining', GREATEST(0, v_quota - v_used),
    'quota_exceeded', v_used >= v_quota,
    'plan_id', v_plan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
