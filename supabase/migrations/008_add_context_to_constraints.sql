-- Ajouter le champ context aux contraintes utilisateur
-- 'any' = bloque toutes les tâches (comportement actuel, rétrocompatible)
ALTER TABLE constraints
ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'any';
