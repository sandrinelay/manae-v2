-- ============================================
-- Migration : Ajout du flag is_founder
-- ============================================
-- Les 100 premiers inscrits sont des "founders"
-- Ils bénéficient du plan Plus gratuitement à vie

ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;

-- Index pour compter rapidement les founders
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_founder
ON user_subscriptions(is_founder)
WHERE is_founder = true;

-- ============================================
-- FONCTION : Compter les founders
-- ============================================
CREATE OR REPLACE FUNCTION count_founders()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM user_subscriptions WHERE is_founder = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permettre l'appel anonyme pour vérifier avant inscription
GRANT EXECUTE ON FUNCTION count_founders() TO anon;
GRANT EXECUTE ON FUNCTION count_founders() TO authenticated;
