-- ============================================
-- Migration : Ajout de la mémoire IA utilisateur
-- ============================================
-- Stocke les apprentissages de l'IA par utilisateur :
--   - 'correction' : corrections manuelles de l'utilisateur (ex: contexte corrigé)
--   - 'pattern'    : habitudes détectées (ex: biais horaire, contexte favori)
-- On upsert sur (user_id, memory_type, key) — pas de created_at nécessaire

CREATE TABLE IF NOT EXISTS user_ai_memory (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type  text        NOT NULL CHECK (memory_type IN ('correction', 'pattern')),
  key          text        NOT NULL,
  value        jsonb       NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_ai_memory_unique UNIQUE (user_id, memory_type, key)
);

-- Index pour accélérer les lectures par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_user_id
ON user_ai_memory(user_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
-- Chaque utilisateur ne voit et ne modifie que ses propres lignes

ALTER TABLE user_ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_ai_memory_select"
ON user_ai_memory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_ai_memory_insert"
ON user_ai_memory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ai_memory_update"
ON user_ai_memory FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ai_memory_delete"
ON user_ai_memory FOR DELETE
USING (auth.uid() = user_id);
