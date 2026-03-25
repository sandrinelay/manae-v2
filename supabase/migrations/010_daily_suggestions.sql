-- Migration 010 : table daily_suggestions
-- Stocke une suggestion de connexion thématique par user par jour
-- Générée par le cron detect-connections (7h00 UTC)

CREATE TABLE daily_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  item_id_1 UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  item_id_2 UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  suggested_date DATE NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, suggested_date)
);

ALTER TABLE daily_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own suggestions"
  ON daily_suggestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
