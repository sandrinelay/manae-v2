-- ============================================
-- MIGRATION: Ajouter quota_max à check_ai_quota()
-- ============================================
-- Cette migration met à jour la fonction check_ai_quota
-- pour retourner aussi le quota maximum configuré

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
      'quota_max', 0,
      'quota_exceeded', true,
      'plan_id', 'essential'
    );
  END IF;

  -- Si plan Plus ou Famille → illimité
  IF v_plan_id IN ('plus', 'family') THEN
    RETURN jsonb_build_object(
      'can_use', true,
      'credits_remaining', NULL,
      'quota_max', NULL,
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

  -- Vérifier quota et retourner avec quota_max
  RETURN jsonb_build_object(
    'can_use', v_used < v_quota,
    'credits_remaining', GREATEST(0, v_quota - v_used),
    'quota_max', v_quota,
    'quota_exceeded', v_used >= v_quota,
    'plan_id', v_plan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
