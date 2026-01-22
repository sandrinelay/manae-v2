# 08 - Roadmap

> Fonctionnalités futures planifiées

---

## 1. Vision à 6 Mois

**Objectif** : Application prête pour le marché avec fonctionnalités core stabilisées et système de paiement actif.

**Cible** : Lancement public avec base utilisateurs early adopters.

---

## 2. Fonctionnalités Planifiées (En Réflexion)

### 2.1 Authentification & Intégrations

| Feature | Description | Priorité | Complexité |
|---------|-------------|----------|------------|
| **Login social multiple** | Google, Apple, Facebook | Haute | Moyenne |
| **Connexion multi-agenda** | Outlook, Apple Calendar, autres | Moyenne | Haute |
| **Synchronisation bi-directionnelle** | Sync 2-way avec calendriers externes | Haute | Haute |

**Notes** :
- Login Google déjà implémenté
- Bi-directionnel : modifications externes → Manae et vice-versa
- Gestion conflits et merge

---

### 2.2 Capture & IA

| Feature | Description | Priorité | Complexité |
|---------|-------------|----------|------------|
| **Enregistrement vocal** | Transcription continue, améliorée | Haute | Moyenne |
| **Analyse prédictive** | Prédire besoins futurs selon historique | Moyenne | Haute |
| **Proposition intelligente de routine** | Suggérer routines récurrentes | Moyenne | Haute |

**Notes** :
- Vocal basic déjà implémenté (Web Speech API)
- Analyse prédictive : ML sur patterns utilisateur
- Routines : détection récurrences ("Tous les lundis...")

---

### 2.3 Organisation & Productivité

| Feature | Description | Priorité | Complexité |
|---------|-------------|----------|------------|
| **Favoris** | Épingler items importants | Basse | Faible |
| **Résumé hebdomadaire** | Email/notif résumé semaine | Moyenne | Moyenne |
| **Dashboard détaillé** | Analytics personnalisées (temps, contextes) | Haute | Haute |
| **Export planning** | PDF, iCal, CSV | Basse | Moyenne |

**Notes** :
- Résumé hebdo : automatisé via cron
- Dashboard : graphiques temps/contexte/mood
- Export : formats standards

---

### 2.4 Collaboration

| Feature | Description | Priorité | Complexité |
|---------|-------------|----------|------------|
| **Espace partagé avec conjoint** | Partage items famille | Haute | Haute |
| **Attribution des tâches** | Assigner tâches à membres famille | Haute | Moyenne |
| **Notifications temps réel** | Push notif changements partagés | Moyenne | Moyenne |

**Notes** :
- Espace partagé : table `shared_spaces` + invitations
- Attribution : colonne `assigned_to` sur items
- Notifs : Firebase Cloud Messaging ou Supabase Realtime

---

### 2.5 Monitoring & Qualité

| Feature | Description | Priorité | Complexité |
|---------|-------------|----------|------------|
| **Analytics (Amplitude, Mixpanel)** | Tracking comportement utilisateur | Haute | Faible |
| **Sentry** | Monitoring erreurs production | Haute | Faible |
| **Tests E2E** | Playwright, Cypress | Moyenne | Moyenne |

**Notes** :
- Sentry : intégration rapide via SDK
- Analytics : identifier features les plus utilisées
- Tests : automatiser scénarios critiques (capture, planification)

---

### 2.6 Monétisation (Stripe)

| Feature | Description | Priorité | Complexité |
|---------|-------------|----------|------------|
| **Intégration Stripe** | Paiements récurrents | **Critique** | Moyenne |
| **Gestion abonnements** | Upgrade/downgrade/cancel | **Critique** | Moyenne |
| **Factures** | Génération PDF factures | Moyenne | Faible |
| **Webhooks Stripe** | Sync événements (paiement, échec) | **Critique** | Moyenne |

**Notes** :
- Structure DB déjà prête (`stripe_customer_id`, `stripe_subscription_id`)
- Webhooks : `/api/stripe/webhook` pour sync statut abo

---

## 3. Plans Tarifaires Envisagés

### 3.1 Version Actuelle (DB)

| Plan | Prix/mois | Quota IA | Features |
|------|-----------|----------|----------|
| Essentiel | Gratuit | 50/semaine | Capture + Tâches + Notes + Courses |
| Plus | 9,99€ | Illimité | + IA illimitée + Développement idées + Google Calendar |
| Famille | 19,99€ | Illimité | + Jusqu'à 5 membres + Partage |

### 3.2 Version Envisagée (À Confirmer)

| Plan | Prix/mois | Quota IA | Features Clés |
|------|-----------|----------|---------------|
| **Essentiel** | **3,99€** | 20/semaine | Découverte, idéal usage occasionnel |
| **Plus** | **7,99€** | Illimité | Standard, power users solo |
| **Premium** | **15,99€** | Illimité | Toutes features + support prioritaire |

**Différenciation Premium** :
- Accès beta nouvelles features
- Analytics avancées
- Export données
- Support email prioritaire
- Espace stockage augmenté

---

## 4. Architecture Technique Future

### 4.1 Scalabilité

**Problématique** : Si croissance rapide utilisateurs.

**Solutions envisagées** :
- **Caching Redis** : Cache sessions, quotas, calendriers
- **CDN** : Assets statiques (Vercel Edge)
- **DB Read Replicas** : Supabase scaling plan
- **Queue Jobs** : BullMQ pour analyses IA async

### 4.2 Sécurité

**Améliorations** :
- **2FA** : Authentification 2 facteurs (TOTP)
- **Audit Logs** : Traçabilité actions sensibles
- **Encryption at rest** : Chiffrement colonnes sensibles (notes privées)
- **Rate Limiting** : Par user/IP (Upstash, Vercel)

### 4.3 Observabilité

**Stack envisagée** :
- **Sentry** : Erreurs + performance monitoring
- **Datadog / New Relic** : APM complet
- **LogRocket** : Session replay bugs users
- **Posthog** : Product analytics + feature flags

---

## 5. Roadmap Timeline (Estimation)

### Phase 1 (Mois 1-2) - Stabilisation
- ✅ Core features fonctionnelles (capture, clarté, planification)
- ✅ Design system complet
- 🚧 Intégration Stripe
- 🚧 Tests E2E critiques
- 🚧 Sentry + Analytics

### Phase 2 (Mois 3-4) - Enrichissement
- Enregistrement vocal amélioré
- Dashboard détaillé
- Résumé hebdomadaire
- Favoris
- Multi-agenda (Outlook)

### Phase 3 (Mois 5-6) - Collaboration
- Espace partagé conjoint
- Attribution tâches
- Notifications temps réel
- Synchronisation bi-directionnelle

### Phase 4 (Mois 6+) - Optimisation
- Analyse prédictive
- Routines intelligentes
- Export avancés
- Support prioritaire Premium

---

## 6. Critères de Succès

### 6.1 Métriques Produit

| Métrique | Cible 6 mois |
|----------|--------------|
| Utilisateurs actifs (MAU) | 1 000 |
| Taux rétention J7 | > 40% |
| Taux conversion gratuit → payant | > 5% |
| NPS (Net Promoter Score) | > 50 |
| Taux complétion onboarding | > 80% |

### 6.2 Métriques Techniques

| Métrique | Cible |
|----------|-------|
| Uptime | > 99.5% |
| Temps réponse API p95 | < 500ms |
| Taux erreur | < 1% |
| Lighthouse Performance | > 90 |

---

## 7. Risques & Dépendances

### 7.1 Risques Identifiés

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| **Coûts IA élevés** | Haute | Moyenne | Quotas stricts, cache, optimisation prompts |
| **API Google instable** | Moyenne | Faible | Fallback mode dégradé, retry logic |
| **Concurrence** | Haute | Haute | Différenciation (IA + famille), marketing |
| **RGPD non-conforme** | Critique | Faible | Audit juridique, consentements clairs |

### 7.2 Dépendances Externes

- **OpenAI** : Risque rate limit, changement tarifs
- **Supabase** : Scaling limits, downtime
- **Google Calendar API** : Quotas, deprecation
- **Stripe** : Frais transaction, conformité

---

## 8. Prochaines Actions Immédiates

### 8.1 Avant Lancement (Critique)

- [ ] **Intégrer Stripe** : Paiements + webhooks
- [ ] **Activer Sentry** : Monitoring erreurs
- [ ] **Tests E2E** : Scénarios critiques
- [ ] **Audit RGPD** : Politique confidentialité, CGU
- [ ] **Beta testeurs** : 20-50 users internes

### 8.2 Post-Lancement (Priorité)

- [ ] **Dashboard analytics** : Comprendre usage
- [ ] **Onboarding amélioré** : Réduire friction
- [ ] **Email marketing** : Drip campaigns retention
- [ ] **Support client** : Intercom, Zendesk
- [ ] **Docs utilisateur** : Centre d'aide

---

## 9. Notes Importantes

### 9.1 Décisions À Prendre

1. **Pricing final** : Confirmer 3,99€ / 7,99€ / 15,99€
2. **Plan gratuit** : Oui ou non ? (Actuellement : Essentiel 3,99€)
3. **Google OAuth scope** : Lecture seule ou écriture calendrier ?
4. **Partage famille** : Nombre max membres (5 ? 10 ?)
5. **Rétention données** : Combien de temps garder items archivés ?

### 9.2 Questions Ouvertes

- **Nom de domaine** : my.manae.app confirmé ?
- **Branding** : Logo, couleurs finales ?
- **Market** : France uniquement ou international (début) ?
- **Mobile app native** : iOS/Android ou PWA suffit ?

---

## 10. Ressources

### 10.1 Outils & Services

- **Design** : Figma
- **Gestion projet** : Notion
- **Communication** : Slack
- **CI/CD** : Vercel (auto-deploy)
- **Monitoring** : Sentry, Datadog
- **Email** : SendGrid, Postmark
- **Support** : Intercom

### 10.2 Documentation Externe

- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Calendar API](https://developers.google.com/calendar)
- [Stripe Docs](https://stripe.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

*Document technique - Roadmap Manae - Janvier 2026*
