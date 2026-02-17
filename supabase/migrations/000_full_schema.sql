-- ============================================
-- SCHÉMA COMPLET MANAE
-- À exécuter sur un nouveau projet Supabase
-- ============================================

-- ============================================
-- TABLE : users (profil utilisateur)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  energy_moments TEXT[],
  password_set BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- TABLE : shopping_lists
-- ============================================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  google_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shopping lists"
  ON shopping_lists FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- TABLE : items (table principale)
-- ============================================
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task', 'note', 'idea', 'list_item')),
  state TEXT NOT NULL CHECK (state IN ('captured', 'active', 'planned', 'completed', 'archived', 'project')),
  content TEXT NOT NULL,
  context TEXT CHECK (context IN ('personal', 'family', 'work', 'health', 'other')),
  ai_analysis JSONB,
  metadata JSONB DEFAULT '{}',
  parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  google_event_id TEXT,
  mood TEXT CHECK (mood IN ('energetic', 'neutral', 'overwhelmed', 'tired')),
  shopping_category TEXT CHECK (shopping_category IN ('bakery', 'dairy', 'meat', 'produce', 'grocery', 'frozen', 'hygiene', 'household', 'drinks', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_state ON items(state);
CREATE INDEX IF NOT EXISTS idx_items_list_id ON items(list_id);
CREATE INDEX IF NOT EXISTS idx_items_parent_id ON items(parent_id);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TABLE : constraints (contraintes horaires)
-- ============================================
CREATE TABLE IF NOT EXISTS constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('work', 'school', 'home', 'sport', 'social', 'other')),
  days TEXT[] NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  allow_lunch_break BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own constraints"
  ON constraints FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 002 : Système de subscriptions
-- ============================================

-- TABLE : subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ai_quota_weekly INT,
  price_monthly DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- TABLE : user_subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id) DEFAULT 'essential',
  ai_quota_weekly INT,
  ai_used_this_week INT DEFAULT 0,
  week_reset_date DATE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_founder BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_founder ON user_subscriptions(is_founder) WHERE is_founder = true;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (true);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (true);

-- TABLE : ai_usage
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('analyze', 'develop_idea', 'suggest_time')),
  cost_credits INT NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_week ON ai_usage(user_id, created_at);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FONCTIONS
-- ============================================

-- check_ai_quota (version finale avec quota_max)
CREATE OR REPLACE FUNCTION check_ai_quota(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan_id TEXT;
  v_quota INT;
  v_used INT;
  v_reset_date DATE;
BEGIN
  SELECT plan_id, ai_quota_weekly, ai_used_this_week, week_reset_date
  INTO v_plan_id, v_quota, v_used, v_reset_date
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_use', false,
      'credits_remaining', 0,
      'quota_max', 0,
      'quota_exceeded', true,
      'plan_id', 'essential'
    );
  END IF;

  IF v_plan_id IN ('plus', 'family') THEN
    RETURN jsonb_build_object(
      'can_use', true,
      'credits_remaining', NULL,
      'quota_max', NULL,
      'quota_exceeded', false,
      'plan_id', v_plan_id
    );
  END IF;

  IF v_reset_date IS NOT NULL AND v_reset_date <= CURRENT_DATE THEN
    UPDATE user_subscriptions
    SET ai_used_this_week = 0,
        week_reset_date = DATE_TRUNC('week', NOW() + INTERVAL '7 days')::DATE
    WHERE user_id = p_user_id;
    v_used := 0;
  END IF;

  RETURN jsonb_build_object(
    'can_use', v_used < v_quota,
    'credits_remaining', GREATEST(0, v_quota - v_used),
    'quota_max', v_quota,
    'quota_exceeded', v_used >= v_quota,
    'plan_id', v_plan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- track_ai_usage (manquait dans les migrations)
CREATE OR REPLACE FUNCTION track_ai_usage(
  p_user_id UUID,
  p_operation TEXT,
  p_cost_credits INT,
  p_item_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage (user_id, operation, cost_credits, item_id)
  VALUES (p_user_id, p_operation, p_cost_credits, p_item_id);

  UPDATE user_subscriptions
  SET ai_used_this_week = ai_used_this_week + p_cost_credits,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- count_founders
CREATE OR REPLACE FUNCTION count_founders()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM user_subscriptions WHERE is_founder = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION count_founders() TO anon;
GRANT EXECUTE ON FUNCTION count_founders() TO authenticated;

-- ============================================
-- TRIGGER : Créer profil + subscription au signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, password_set)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    true
  );

  INSERT INTO public.user_subscriptions (user_id, plan_id, ai_quota_weekly, week_reset_date)
  VALUES (
    NEW.id,
    'essential',
    10,
    DATE_TRUNC('week', NOW() + INTERVAL '7 days')::DATE
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
