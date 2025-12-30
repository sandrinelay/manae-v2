# État des lieux - Page Clarté : Module Notes

## Vue d'ensemble

La page Clarté est le centre de gestion des éléments capturés dans Manae. Elle permet de visualiser, organiser et agir sur les tâches, notes, idées et courses.

---

## Architecture actuelle

### Structure des fichiers

```
app/clarte/
├── page.tsx              # Dashboard principal (520 lignes)
├── notes/
│   └── page.tsx          # Page dédiée aux notes (200 lignes)
├── idees/
│   └── page.tsx          # Page dédiée aux idées
└── courses/
    └── page.tsx          # Page dédiée aux courses

components/clarte/
├── ClarteHeader.tsx      # Header avec recherche et filtres
├── blocks/
│   ├── NotesBlock.tsx    # Bloc notes (max 4 affichées)
│   ├── TasksBlock.tsx    # Bloc tâches
│   ├── IdeasBlock.tsx    # Bloc idées
│   └── ShoppingBlock.tsx # Bloc courses
├── cards/
│   ├── NoteRow.tsx       # Ligne de note individuelle
│   ├── TaskCard.tsx      # Carte de tâche
│   ├── IdeaCard.tsx      # Carte d'idée
│   └── ShoppingItemChip.tsx
├── modals/
│   ├── NoteDetailModal.tsx   # Modal détail note
│   ├── TaskActiveModal.tsx   # Modal tâche active
│   ├── TaskDetailModal.tsx   # Modal tâche terminée/rangée
│   └── PlanTaskModal.tsx     # Modal planification
└── views/
    └── TasksFullView.tsx     # Vue complète des tâches

hooks/
└── useClarteData.ts      # Hook de récupération des données (188 lignes)

config/
└── contexts.ts           # Configuration des contextes (icônes, couleurs)

types/
└── items.ts              # Types TypeScript pour les items
```

---

## Types et données

### Item (types/items.ts)

```typescript
type ItemType = 'task' | 'note' | 'idea' | 'list_item'

type ItemState =
  | 'captured'   // Vient d'être capturé, à clarifier
  | 'active'     // Clarifié, prêt à utiliser
  | 'project'    // Idée convertie en projet
  | 'planned'    // Tâche planifiée
  | 'completed'  // Terminé
  | 'archived'   // Archivé

type ItemContext = 'personal' | 'family' | 'work' | 'health' | 'other'

interface Item {
  id: string
  user_id: string
  type: ItemType
  state: ItemState
  content: string
  context?: ItemContext | null
  ai_analysis?: AIAnalysis | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // ... autres champs
}
```

### Contextes (config/contexts.ts)

| Contexte | Icône | Couleur |
|----------|-------|---------|
| personal | UserIcon | Teal |
| family | UsersIcon | Rose |
| work | BriefcaseIcon | Bleu |
| health | HeartIcon | Rouge |
| other | PinIcon | Gris |

---

## Module Notes - Fonctionnalités

### Implémentées

| Fonctionnalité | Fichier | Status |
|----------------|---------|--------|
| Affichage bloc notes (max 4) | NotesBlock.tsx | OK |
| Page complète des notes | notes/page.tsx | OK |
| Onglets Actives / Archivées | notes/page.tsx | OK |
| Filtrage par contexte | notes/page.tsx | OK |
| Recherche dans les notes | notes/page.tsx | OK |
| Modal de détail | NoteDetailModal.tsx | OK |
| Archiver une note | NoteDetailModal.tsx | OK |
| Supprimer une note | NoteDetailModal.tsx | OK |
| Affichage contexte + date | NoteRow.tsx | OK |

### Non implémentées

| Fonctionnalité | Fichier | TODO |
|----------------|---------|------|
| **Modifier une note** | NoteDetailModal.tsx | `onEdit={() => {/* TODO */}}` |
| Changer le contexte | - | Non prévu |
| Opérations en masse | - | Non prévu |
| Notes épinglées/favorites | - | Non prévu |
| Texte enrichi | - | Non prévu |

---

## Flux de données

### useClarteData Hook

```typescript
// Chargement initial : limité pour performance
{ tasks: 4, notes: 5, ideas: 4, shopping: 6 }

// Mode recherche : charge tout
{ tasks: 100, notes: 100, ideas: 100, shopping: 100 }
```

### Requêtes Supabase pour les notes

```sql
-- Récupérer les notes actives
SELECT * FROM items
WHERE user_id = :user_id
  AND type = 'note'
  AND state IN ('active', 'captured')
ORDER BY updated_at DESC

-- Archiver une note
UPDATE items
SET state = 'archived', updated_at = NOW()
WHERE id = :id

-- Supprimer une note
DELETE FROM items WHERE id = :id
```

---

## Composants UI utilisés

### Boutons harmonisés (récemment mis à jour)

| Composant | Usage dans Notes |
|-----------|------------------|
| ActionButton | Modifier (secondary), Archiver (archive) |
| IconButton | Supprimer (danger, size="md") |

### NoteDetailModal - Structure actuelle

```tsx
<NoteDetailModal
  note={selectedNote}
  onClose={() => setSelectedNote(null)}
  onEdit={(id) => {/* TODO */}}
  onArchive={(id) => handleArchive(id)}
  onDelete={(id) => handleDelete(id)}
/>
```

### NoteRow - Affichage

```
[Icône Contexte] Contenu de la note...          il y a 2h
```

---

## Prochaines étapes suggérées

### 1. Implémenter l'édition des notes (Priorité haute)

**Fichiers à modifier :**
- `NoteDetailModal.tsx` - Ajouter mode édition
- `notes/page.tsx` - Gérer le callback onEdit
- Potentiellement créer `NoteEditModal.tsx`

**Fonctionnalités :**
- Éditer le contenu de la note
- Changer le contexte
- Sauvegarder les modifications

### 2. Améliorations UX (Priorité moyenne)

- Swipe actions sur mobile (archiver, supprimer)
- Animation de transition entre les états
- Confirmation avant suppression

### 3. Fonctionnalités avancées (Priorité basse)

- Notes épinglées en haut de liste
- Tri par date de création / modification
- Export des notes
- Partage de notes

---

## Notes techniques

### Points d'attention

1. **État `captured` vs `active`** : Les notes peuvent avoir l'un ou l'autre état, les deux sont affichés dans l'onglet "Actives"

2. **Pas de confirmation pour archivage** : L'archivage est direct, contrairement à la suppression qui a une confirmation (dans TaskDetailModal)

3. **Recherche** : Déclenche un chargement complet de toutes les données

4. **Performance** : Le hook utilise `hasFullDataRef` pour éviter les rechargements inutiles

### Cohérence à maintenir

- Même hauteur de boutons (48px) que dans les autres modales
- Mêmes variantes de couleurs (ActionButton variants)
- Format de date relatif (`formatRelativeTime`)
- Icônes depuis la bibliothèque centralisée (`components/ui/icons`)
