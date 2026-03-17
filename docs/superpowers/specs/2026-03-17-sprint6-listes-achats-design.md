# Sprint 6 — Listes d'achats multiples : Design

**Date :** 2026-03-17
**Statut :** Approuvé

---

## Objectif

Remplacer la liste de courses unique par 5 listes d'achats distinctes, personnalisables par l'utilisateur, avec détection automatique par l'IA et intégration GCal par liste.

---

## Listes

5 listes fixes, créées pour chaque utilisateur :

| Slug | Nom | Toujours active |
|------|-----|-----------------|
| `alimentaire` | Alimentaire | Oui (verrouillée) |
| `maison` | Maison | Non |
| `enfants` | Enfants | Non |
| `pro` | Pro | Non |
| `en-ligne` | En ligne | Non |

Règle : **Alimentaire ne peut pas être désactivée** (enforced en UI, pas en DB).

---

## Base de données

### Nouvelle table `lists`

```sql
create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  slug text not null,
  position int not null,
  enabled boolean not null default true,
  created_at timestamptz default now(),
  unique(user_id, slug)
);
```

### Migration

1. Créer `lists` avec les 5 entrées par utilisateur (trigger + migration existants)
2. Migrer `items.list_id` FK de `shopping_lists` → `lists`
3. Assigner les `list_item` existants sans `list_id` → liste `alimentaire`
4. **Supprimer** la table `shopping_lists` (nettoyage complet, pas de dette)

---

## Ajout manuel d'articles

- **Par défaut** : l'article va dans la liste de l'onglet actif
- **Déplacer** : via le modal de détail (`ShoppingItemModal`) → sélecteur "Déplacer vers…" listant les autres listes activées
- Pas de sélecteur au moment de la saisie (friction inutile)

---

## Sous-catégories

- **Alimentaire uniquement** : groupes par catégorie dans l'ordre du magasin (comportement existant conservé)
- **4 autres listes** : liste simple, pas de sous-catégories

---

## Compteurs dans les onglets

- Format : `Alimentaire 3` (sans parenthèses)
- Compteur = articles actifs uniquement (pas les cochés)
- Pas de compteur si liste vide
- Onglets des listes désactivées dans le profil : masqués

---

## Planification GCal

- Par liste, pas globale
- Titre de l'événement : "Achats [Nom de la liste]" (ex: "Achats Alimentaire")
- `PlanShoppingModal` reçoit la liste active en paramètre

---

## Onboarding

Nouvelle **étape 4** (après GCal) :

- Titre : "Personnalise tes listes d'achats"
- 5 checkboxes : Alimentaire (pré-cochée, désactivée), Maison, Enfants, Pro, En ligne
- Légère et rapide (~10 secondes)
- Stocké via `create_default_lists` + update `enabled` sur les listes non sélectionnées

---

## Profil

Section dédiée **"Mes listes d'achats"** avec toggles on/off pour les 4 listes optionnelles. Alimentaire non modifiable.

---

## Prompt IA — Règles de détection `list_slug`

Champ ajouté dans la réponse JSON pour les `list_item` :

```
"list_slug": "alimentaire" | "maison" | "enfants" | "pro" | "en-ligne"
```

**Règles de priorité :**

| Exemple | Liste |
|---------|-------|
| nourriture, boissons, produits frais | `alimentaire` |
| lessive, ampoules, éponges, plantes | `maison` |
| fournitures scolaires, jouets, vêtements enfants | `enfants` |
| stylos, post-its, logiciels, abonnements pro | `pro` |
| tout ambigu ou commande internet | `en-ligne` |

**Règles clés :**
- Alimentaire = ce qu'on mange ou boit **uniquement**
- "lessive" → Maison (pas Alimentaire)
- "fournitures scolaires" → Enfants (contexte enfant prime sur Pro)
- Ambigu → En ligne (pas Alimentaire)

---

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Créer | `supabase/migrations/007_lists.sql` |
| Créer | `types/lists.ts` |
| Créer | `services/lists.service.ts` |
| Modifier | `services/shopping.service.ts` |
| Modifier | `components/clarte/blocks/ShoppingBlock.tsx` |
| Modifier | `components/clarte/views/ShoppingFullView.tsx` |
| Modifier | `components/clarte/modals/ShoppingItemModal.tsx` |
| Modifier | `components/clarte/modals/PlanShoppingModal.tsx` |
| Modifier | `prompts/analyze.ts` |
| Modifier | `app/api/analyze-v2/route.ts` |
| Modifier | `app/onboarding/` (nouvelle étape 4) |
| Modifier | `app/profil/` (section listes) |
| Modifier | `hooks/useClarteData.ts` |
