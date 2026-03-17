-- ============================================
-- Table lists : remplace shopping_lists
-- ============================================

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  position int NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, slug)
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_lists"    ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_lists" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_lists" ON lists FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Seed : 5 listes par utilisateur
-- ============================================

CREATE OR REPLACE FUNCTION create_default_lists(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO lists (user_id, name, slug, position) VALUES
    (p_user_id, 'Alimentaire', 'alimentaire', 1),
    (p_user_id, 'Maison',      'maison',      2),
    (p_user_id, 'Enfants',     'enfants',     3),
    (p_user_id, 'Pro',         'pro',         4),
    (p_user_id, 'En ligne',    'en-ligne',    5)
  ON CONFLICT (user_id, slug) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user_lists()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM create_default_lists(new.id);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_lists ON auth.users;
CREATE TRIGGER on_auth_user_created_lists
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user_lists();

-- Créer les listes pour les utilisateurs existants
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    PERFORM create_default_lists(r.id);
  END LOOP;
END;
$$;

-- ============================================
-- Migration items.list_id : shopping_lists → lists
-- ============================================

-- 1. Vider les anciens list_id (ils pointent vers shopping_lists, pas vers lists)
UPDATE items SET list_id = NULL WHERE list_id IS NOT NULL;

-- 2. Supprimer l'ancienne FK
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_list_id_fkey;

-- 3. Ajouter la nouvelle FK vers lists
ALTER TABLE items
  ADD CONSTRAINT items_list_id_fkey
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL;

-- 4. Ré-assigner les list_item vers la liste "alimentaire"
UPDATE items
SET list_id = l.id
FROM lists l
WHERE items.type = 'list_item'
  AND l.user_id = items.user_id
  AND l.slug = 'alimentaire';

-- 5. Supprimer l'ancienne table
DROP TABLE IF EXISTS shopping_lists CASCADE;
