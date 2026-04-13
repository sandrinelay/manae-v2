-- ============================================
-- Migration 006 : Ajout des contextes admin et home
-- Sprint 2 — SAN-8
-- Les items existants en 'other' restent valides (rétrocompat)
-- ============================================

-- Supprimer l'ancienne contrainte CHECK sur context
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_context_check;

-- Ajouter la nouvelle contrainte avec admin et home
ALTER TABLE items ADD CONSTRAINT items_context_check
  CHECK (context IN ('personal', 'family', 'work', 'health', 'other', 'admin', 'home'));
