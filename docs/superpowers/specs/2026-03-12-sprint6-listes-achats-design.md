# Sprint 6 — Listes d'achats multiples Design

## Objectif

Remplacer la liste de courses unique par 5 listes d'achats distinctes, accessibles via onglets. L'IA détecte automatiquement la bonne liste à la capture.

## Décisions de design

- **5 listes fixes** (pas de création libre) : Alimentaire, Maison, Enfants, Pro, En ligne
- **Navigation** : onglets horizontaux scrollables dans la vue complète
- **Preview Clarté** : résumé par liste (comptes) — listes vides masquées
- **Migration items existants** : tous en Alimentaire par défaut (simple et honnête)
- **Terminologie** : "Courses" → "Achats" partout dans l'UI, labels et constantes

## Architecture

### Base de données

Nouvelle table `lists` :
```sql
create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,          -- "Alimentaire", "Maison", etc.
  slug text not null,          -- "alimentaire", "maison", etc.
  position int not null,       -- ordre d'affichage
  created_at timestamptz default now()
);
-- RLS : user voit uniquement ses listes
-- Seed : 5 listes créées automatiquement à l'inscription (trigger ou onboarding)
```

La colonne `list_id` existe déjà sur `items` — on active la foreign key vers `lists`.

Migration : tous les `list_item` sans `list_id` → assignés à la liste Alimentaire de l'utilisateur.

### Fichiers

| Fichier | Action | Rôle |
|---------|--------|------|
| `supabase/migrations/006_lists.sql` | Créer | Table lists + RLS + trigger seed |
| `services/lists.service.ts` | Créer | Fetch listes, fetch items par liste |
| `types/lists.ts` | Créer | Type `List` |
| `components/clarte/blocks/ShoppingBlock.tsx` | Modifier | Preview résumé par liste |
| `components/clarte/views/ShoppingFullView.tsx` | Modifier | Onglets + vue par liste |
| `prompts/analyze.ts` | Modifier | Détection liste dans le prompt |
| `constants/labels.ts` | Modifier | "Courses" → "Achats" |

## Vue complète — Onglets

5 onglets scrollables : `Alimentaire | Maison | Enfants | Pro | En ligne`

**Onglet Alimentaire** : groupes par catégorie conservés (Boulangerie, Crèmerie, Viandes, Fruits & Légumes, Épicerie, Surgelés, Hygiène, Entretien, Boissons, Bébé, Autre)

**Autres onglets** : liste simple sans groupes, triée par date de création

**Chaque item** :
- Checkbox → state `completed` (grisé + déplacé en bas)
- Bouton "Vider les cochés" en bas de liste si items complétés présents

## Bloc preview dans Clarté

Résumé compact, listes vides masquées :
```
Achats                          [Voir tout]
  Alimentaire          4 items
  Maison               2 items
  Pro                  1 item
```
Tap sur une ligne → ouvre la vue complète sur l'onglet correspondant.

## IA — Détection de la liste

Nouveau champ `list_slug` dans la réponse pour les `list_item`.

**Règles dans le prompt** :
- `alimentaire` : nourriture, boissons, produits frais, hygiène alimentaire (lait, pain, savon, shampooing)
- `maison` : entretien, ménage, bricolage, jardinage (lessive, ampoules, piles, éponges)
- `enfants` : scolaire, vêtements enfants, activités, jouets, fournitures école
- `pro` : matériel bureau, logiciels, abonnements professionnels, fournitures bureau
- `en-ligne` : commandes internet diverses, cas ambigus, tout le reste

Cas par défaut si ambigu → `en-ligne`.

## Ce qui est hors scope

- Création/suppression/renommage de listes par l'utilisateur
- Déplacement d'un item d'une liste à une autre (V1 : l'IA peut se tromper, l'utilisateur accepte)
- Partage de liste avec un autre utilisateur
