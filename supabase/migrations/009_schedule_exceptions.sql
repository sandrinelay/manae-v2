-- Migration 009 : table schedule_exceptions
-- Exceptions ponctuelles (congés, journées à horaires réduits)
-- Les plages horaires récurrentes restent dans la table constraints existante

CREATE TABLE schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('blocked', 'modified')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  modified_start_time TEXT,   -- ex: "10:00" — uniquement si type = 'modified'
  modified_end_time TEXT,     -- ex: "15:00"
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exceptions"
  ON schedule_exceptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
