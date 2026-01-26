# 02 - Base de Données

> Documentation complète du schéma Supabase (PostgreSQL)

---

## 1. Vue d'ensemble

### 1.1 Tables

| Table | Description | RLS |
|-------|-------------|-----|
| `users` | Profils utilisateurs | Oui |
| `items` | Éléments capturés (tâches, notes, idées, courses) | Oui |
| `shopping_lists` | Listes de courses | Oui |
| `constraints` | Indisponibilités récurrentes | Oui |
| `subscription_plans` | Plans d'abonnement | Oui |
| `user_subscriptions` | Abonnements utilisateurs | Oui |
| `ai_usage` | Tracking consommation IA | Oui |
| `waitlist` | Liste d'attente | Oui |

### 1.2 Diagramme des Relations

```
                    ┌─────────────────┐
                    │   auth.users    │
                    │   (Supabase)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │    users    │  │ constraints │  │shopping_lists│
    └──────┬──────┘  └─────────────┘  └──────┬──────┘
           │                                  │
           │         ┌─────────────┐          │
           └────────►│    items    │◄─────────┘
                     └──────┬──────┘
                            │ parent_id
                            ▼
                     ┌─────────────┐
                     │    items    │
                     │  (projets)  │
                     └─────────────┘
```

---

## 2. Table `users`

### 2.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | uuid | NON | - | PK, FK vers auth.users |
| `email` | text | NON | - | Email utilisateur |
| `first_name` | text | OUI | null | Prénom |
| `last_name` | text | OUI | null | Nom |
| `energy_moments` | text[] | OUI | null | Moments d'énergie préférés |
| `onboarding_completed` | boolean | OUI | false | Onboarding terminé |
| `password_set` | boolean | OUI | false | Mot de passe défini (invitations) |
| `created_at` | timestamptz | OUI | now() | Date création |
| `updated_at` | timestamptz | OUI | now() | Date modification |

### 2.2 Contraintes

- **PK** : `id`
- **FK** : `id` → `auth.users.id`

### 2.3 RLS Policies

```sql
-- Lecture : propres données uniquement
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Insertion : son propre profil
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Mise à jour : propres données
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

---

## 3. Table `items`

### 3.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | uuid | NON | gen_random_uuid() | PK |
| `user_id` | uuid | NON | - | FK vers auth.users |
| `type` | text | NON | - | Type d'item |
| `content` | text | NON | - | Contenu texte |
| `context` | text | OUI | null | Contexte |
| `state` | text | NON | 'captured' | État lifecycle |
| `ai_analysis` | jsonb | OUI | null | Résultat analyse IA |
| `metadata` | jsonb | OUI | '{}' | Métadonnées diverses |
| `parent_id` | uuid | OUI | null | FK vers items (projets) |
| `list_id` | uuid | OUI | null | FK vers shopping_lists |
| `scheduled_at` | timestamptz | OUI | null | Date planifiée |
| `google_event_id` | text | OUI | null | ID événement Google |
| `mood` | text | OUI | null | Humeur à la capture |
| `shopping_category` | text | OUI | null | Catégorie courses |
| `created_at` | timestamptz | OUI | now() | Date création |
| `updated_at` | timestamptz | OUI | now() | Date modification |

### 3.2 Contraintes Check

```sql
-- Type
CHECK (type IN ('task', 'note', 'idea', 'list_item'))

-- State
CHECK (state IN ('captured', 'active', 'project', 'planned', 'completed', 'archived'))

-- Context
CHECK (context IN ('personal', 'family', 'work', 'health', 'other'))

-- Mood
CHECK (mood IN ('energetic', 'neutral', 'overwhelmed', 'tired'))

-- Shopping Category
CHECK (shopping_category IS NULL OR shopping_category IN (
  'produce', 'bakery', 'dairy', 'meat', 'grocery',
  'frozen', 'drinks', 'baby', 'hygiene', 'household', 'other'
))
```

### 3.3 Relations

- **FK** `user_id` → `auth.users.id`
- **FK** `parent_id` → `items.id` (auto-référence pour projets)
- **FK** `list_id` → `shopping_lists.id`
- **UNIQUE** `google_event_id`

### 3.4 RLS Policies

```sql
-- Lecture
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

-- Insertion
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mise à jour
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);
```

### 3.5 Type × State : Matrice Valide

| Type | captured | active | planned | project | completed | archived |
|------|----------|--------|---------|---------|-----------|----------|
| task | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| note | ✓ | ✓ | - | - | ✓ | ✓ |
| idea | ✓ | ✓ | - | ✓ | ✓ | ✓ |
| list_item | ✓ | ✓ | - | - | ✓ | ✓ |

### 3.6 Structure `ai_analysis` (JSONB)

```typescript
interface AIAnalysis {
  original_text: string
  confidence: number
  temporal_constraint?: {
    type: 'deadline' | 'fixed_date' | 'start_date' | 'time_range' | 'asap'
    date?: string           // ISO pour deadline/fixed_date
    start_date?: string     // ISO pour start_date/time_range
    end_date?: string       // ISO pour time_range
    urgency: 'critical' | 'high' | 'medium' | 'low'
    raw_pattern?: string    // Expression originale
  }
  extracted_data?: {
    category?: string       // Pour list_item
  }
}
```

### 3.7 Structure `metadata` (JSONB)

```typescript
interface ItemMetadata {
  // Pour les projets développés
  development_context?: {
    idea_age: 'fresh' | 'old'
    blockers?: string[]
    refined_title?: string
    steps?: string[]
    estimated_time?: string
    budget?: string
    motivation?: string
  }

  // Autres métadonnées potentielles
  [key: string]: unknown
}
```

---

## 4. Table `shopping_lists`

### 4.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | uuid | NON | gen_random_uuid() | PK |
| `user_id` | uuid | NON | - | FK vers auth.users |
| `name` | text | NON | 'Courses' | Nom de la liste |
| `status` | text | NON | 'active' | Statut |
| `scheduled_at` | timestamptz | OUI | null | Date planifiée |
| `google_event_id` | text | OUI | null | ID événement Google |
| `created_at` | timestamptz | OUI | now() | Date création |
| `updated_at` | timestamptz | OUI | now() | Date modification |

### 4.2 Contraintes

```sql
CHECK (status IN ('active', 'completed', 'archived'))
```

### 4.3 RLS Policies

```sql
CREATE POLICY "Users can view own shopping lists" ON shopping_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping lists" ON shopping_lists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping lists" ON shopping_lists
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 5. Table `constraints`

### 5.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | uuid | NON | gen_random_uuid() | PK |
| `user_id` | uuid | NON | - | FK vers users |
| `name` | text | NON | - | Nom (ex: "Travail") |
| `category` | text | NON | - | Catégorie |
| `days` | text[] | NON | - | Jours actifs |
| `start_time` | time | NON | - | Heure début |
| `end_time` | time | NON | - | Heure fin |
| `allow_lunch_break` | boolean | OUI | null | Pause déjeuner autorisée |
| `created_at` | timestamptz | OUI | now() | Date création |

### 5.2 Catégories Valides

- `work` : Travail
- `school` : École
- `home` : Maison
- `sport` : Sport
- `social` : Social
- `other` : Autre

### 5.3 Jours Valides

```
['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
```

### 5.4 RLS Policy

```sql
CREATE POLICY "Users can manage own constraints" ON constraints
  FOR ALL USING (auth.uid() = user_id);
```

---

## 6. Table `subscription_plans`

### 6.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | text | NON | - | PK (ex: 'essential') |
| `name` | text | NON | - | Nom affiché |
| `price_monthly` | numeric | NON | - | Prix mensuel |
| `ai_quota_weekly` | integer | OUI | null | Quota IA (null = illimité) |
| `features` | jsonb | OUI | '[]' | Liste features |
| `stripe_price_id` | text | OUI | null | ID prix Stripe |
| `created_at` | timestamptz | OUI | now() | Date création |

### 6.2 Données Actuelles

| id | name | price_monthly | ai_quota_weekly | features |
|----|------|---------------|-----------------|----------|
| essential | Essentiel | 0.00 | 50 | ["Capture illimitée", "10 analyses IA/semaine", "Notes et tâches", "Liste de courses"] |
| plus | Plus | 9.99 | null | ["Tout Essentiel", "IA illimitée", "Développement idées", "Planification intelligente", "Google Calendar"] |
| family | Famille | 19.99 | null | ["Tout Plus", "Jusqu'à 5 membres", "Partage de tâches", "Calendrier familial"] |

### 6.3 RLS Policy

```sql
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (true);
```

---

## 7. Table `user_subscriptions`

### 7.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `user_id` | uuid | NON | - | PK, FK vers auth.users |
| `plan_id` | text | NON | 'essential' | FK vers subscription_plans |
| `ai_quota_weekly` | integer | OUI | null | Quota (override plan) |
| `ai_used_this_week` | integer | OUI | 0 | Crédits utilisés |
| `week_reset_date` | date | OUI | null | Date reset hebdo |
| `stripe_customer_id` | text | OUI | null | ID client Stripe |
| `stripe_subscription_id` | text | OUI | null | ID abonnement Stripe |
| `created_at` | timestamptz | OUI | now() | Date création |
| `updated_at` | timestamptz | OUI | now() | Date modification |

### 7.2 RLS Policies

```sql
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 7.3 Trigger Auto-création

Quand un utilisateur est créé, une souscription `essential` est automatiquement créée :

```sql
-- Trigger function
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_id)
  VALUES (NEW.id, 'essential')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_subscription();
```

---

## 8. Table `ai_usage`

### 8.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | uuid | NON | gen_random_uuid() | PK |
| `user_id` | uuid | NON | - | FK vers auth.users |
| `operation` | text | NON | - | Type opération |
| `cost_credits` | integer | NON | - | Coût en crédits |
| `item_id` | uuid | OUI | null | FK vers items |
| `created_at` | timestamptz | OUI | now() | Date opération |

### 8.2 Opérations Valides

```sql
CHECK (operation IN ('analyze', 'develop_idea', 'suggest_time'))
```

### 8.3 Coûts par Opération

| Operation | cost_credits |
|-----------|--------------|
| analyze | 1 |
| develop_idea | 2 |
| suggest_time | 1 |

### 8.4 RLS Policies

```sql
-- Lecture propres usages
CREATE POLICY "Users can view their own AI usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Insertion (système)
CREATE POLICY "System can insert AI usage" ON ai_usage
  FOR INSERT WITH CHECK (true);
```

---

## 9. Table `waitlist`

### 9.1 Structure

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | uuid | NON | gen_random_uuid() | PK |
| `first_name` | text | NON | - | Prénom |
| `last_name` | text | NON | - | Nom |
| `email` | text | NON | - | Email (UNIQUE) |
| `created_at` | timestamptz | OUI | now() | Date inscription |
| `invited_at` | timestamptz | OUI | null | Date invitation |

### 9.2 RLS Policies

```sql
-- Authentifiés : accès complet
CREATE POLICY "Accès complet pour utilisateurs authentifiés" ON waitlist
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Anonymes : insertion avec validation
CREATE POLICY "Autoriser inscription waitlist anonyme" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (
    first_name IS NOT NULL AND first_name <> '' AND
    last_name IS NOT NULL AND last_name <> '' AND
    email IS NOT NULL AND email <> '' AND
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );
```

---

## 10. Migrations

### 10.1 Historique

| Version | Nom | Description |
|---------|-----|-------------|
| 20251208083116 | add_users_insert_policy | Policy insertion users |
| 20251208094258 | allow_anonymous_thoughts | Pensées anonymes |
| 20251215234717 | idea_development_system | Système dev idées |
| 20251216073649 | shopping_list_rls_policies | RLS shopping |
| 20251218223816 | enable_rls_items_shopping_lists | Activation RLS |
| 20251221204926 | add_other_to_context_check | Ajout contexte 'other' |
| 20251221210521 | add_overwhelmed_to_mood_check | Ajout mood 'overwhelmed' |
| 20260101230206 | add_shopping_category_to_items | Catégories courses |
| 20260113223237 | create_user_subscription_trigger | Auto-création subscription |
| 20260113224405 | add_password_set_column | Colonne password_set |

### 10.2 Fichiers

Localisation : `supabase/migrations/`

---

## 11. Index Recommandés

```sql
-- Recherche items par user et type
CREATE INDEX idx_items_user_type ON items(user_id, type);

-- Recherche items par user et state
CREATE INDEX idx_items_user_state ON items(user_id, state);

-- Recherche items par list_id
CREATE INDEX idx_items_list_id ON items(list_id) WHERE list_id IS NOT NULL;

-- Recherche constraints par user
CREATE INDEX idx_constraints_user ON constraints(user_id);

-- Recherche ai_usage par user et date
CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, created_at);
```

---

## 12. Requêtes Courantes

### 12.1 Récupérer items actifs d'un utilisateur

```sql
SELECT * FROM items
WHERE user_id = $1
  AND state IN ('active', 'planned', 'captured')
ORDER BY created_at DESC;
```

### 12.2 Récupérer tâches avec contraintes temporelles

```sql
SELECT * FROM items
WHERE user_id = $1
  AND type = 'task'
  AND state IN ('active', 'captured')
  AND ai_analysis->'temporal_constraint' IS NOT NULL
ORDER BY
  (ai_analysis->'temporal_constraint'->>'date')::timestamp NULLS LAST;
```

### 12.3 Vérifier quota IA

```sql
SELECT
  us.ai_used_this_week,
  COALESCE(us.ai_quota_weekly, sp.ai_quota_weekly) as quota,
  CASE
    WHEN sp.ai_quota_weekly IS NULL THEN false
    ELSE us.ai_used_this_week >= COALESCE(us.ai_quota_weekly, sp.ai_quota_weekly)
  END as quota_exceeded
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = $1;
```

### 12.4 Articles de courses par catégorie

```sql
SELECT
  shopping_category,
  array_agg(json_build_object(
    'id', id,
    'content', content,
    'state', state
  )) as items
FROM items
WHERE user_id = $1
  AND type = 'list_item'
  AND state = 'active'
GROUP BY shopping_category;
```

---

*Document technique - Base de données Manae*
