# Les Monstres — Cahier des charges (référence projet)

> Document de référence fonctionnelle et technique pour Claude Code.
> Version 1.2 — stack backend migrée de Laravel/PHP vers **NestJS/TypeScript
> + Prisma** (décision du 2026-07-21). Développement local **sans Docker** ;
> Docker Compose réservé au déploiement sur le serveur Proxmox.
>
> **Convention de vocabulaire fondamentale :** dans l'interface, un objet
> encombrant abandonné s'appelle un **Monstre**. Dans le code et la base de
> données, on utilise le terme générique **Item** / `items`.
> **Ne jamais employer le mot `monster` dans le code** afin de conserver une
> architecture réutilisable.

---

## 0. À lire en premier — instructions pour Claude Code

### Mission
Concevoir et développer l'application **Les Monstres** : une plateforme
communautaire (et non un simple formulaire de signalement) qui permet de
repérer, partager et récupérer des objets encombrants abandonnés dans la rue.

### Principes directeurs (non négociables)
- **Mobile-first.**
- **UX extrêmement simple** : créer un Monstre en **moins de 30 secondes**.
- **Architecture évolutive** : prête pour de futures apps natives iOS/Android
  et une montée en charge à plusieurs milliers d'utilisateurs.
- **Code maintenable**, testé, documenté.
- **Sécurité** de bout en bout.

### Règles d'or de développement
- **Aucune règle métier codée en dur.** Toute valeur ajustable
  (durées, seuils, points, limites…) vit dans la table `settings`.
- **Ne jamais mélanger frontend et backend.** L'API doit tout exposer :
  le frontend web n'est qu'un client parmi d'autres (mobile à venir).
- **Logique métier dans des Services**, jamais dans les contrôleurs.
- **Ne jamais supprimer une possibilité d'évolution** pour aller plus vite.
- Toujours **expliquer les choix importants** et **proposer les améliorations
  pertinentes**.

### Méthode : développement incrémental
Ne pas générer toute l'application d'un coup. Avancer par phases, chacune
produisant une **version fonctionnelle et testée** (voir §17).

```
Conception → Architecture → Base technique → Fonctionnalité → Tests → Validation → suivante
```

---

## 1. Vision & concept

Un utilisateur repère dans la rue un objet encombrant (canapé, meuble,
électroménager, vélo, matériel de jardin, objets divers…). Il ouvre l'app et :

1. prend une photo ;
2. l'app récupère automatiquement date, heure et position GPS ;
3. il confirme/corrige la localisation ;
4. il donne un **nom** au Monstre ;
5. il ajoute une **description** (optionnelle) ;
6. il **publie**.

Le Monstre devient visible pour les autres utilisateurs, qui peuvent le
consulter, voter, réserver puis récupérer.

## 2. Objectifs

- **Écologique** : réemploi, récupération, réduction des déchets, économie
  circulaire.
- **Communautaire** : partager les découvertes, aider les voisins, valoriser
  les objets abandonnés.
- **Ludique** : score, badges, classement, découvertes, récompenses.

## 3. Positionnement (inspirations)

| Source | Ce qu'on en reprend |
|---|---|
| Facebook | profils, communauté, interactions, publications |
| Dealabs | votes, classement, intérêt communautaire |
| Waze | localisation, information temps réel |
| Leboncoin | récupération d'objets |
| Pokémon Go | découverte, chasse, récompenses |

Le nom vient du groupe Facebook existant « Les Monstres ».

## 4. Parcours utilisateur clé (< 30 s)

```
OUVRIR → PHOTO → POSITION → TITRE → PUBLIER
```

Style d'interface : moderne, épuré, intuitif, rapide. Inspirations :
Facebook mobile, Instagram, applications communautaires actuelles.

Navigation principale — **barre basse** :

```
Accueil | Carte | Ajouter | Alertes | Profil
```

---

## 5. Rôles & permissions

### Visiteur non connecté
- **Peut** : voir les Monstres publics, consulter la liste, voir une carte
  générale (**zone approximative uniquement**, pas l'adresse exacte).
- **Ne peut pas** : créer, réserver, voter, commenter, voir l'adresse précise.

### Utilisateur connecté
- Créer un Monstre, réserver, récupérer, voter, commenter, gérer ses alertes,
  participer au classement, voir l'adresse exacte.

### Rôles administratifs (voir §14)
- **Modérateur** : traite les signalements, masque du contenu, sanctionne.
- **Administrateur** : gère utilisateurs, Monstres, catégories, paramètres.
- **Super Administrateur** : configuration système, gestion des admins, accès
  logs, suppression définitive.

---

## 6. Domaine métier

### 6.1 Item (Monstre)

Un **Item** représente un objet abandonné signalé par un utilisateur.

**Cycle de vie / `status`** (enum canonique) :

| Statut | Sens | Visibilité / actions |
|---|---|---|
| `AVAILABLE` | Disponible | Visible de tous ; consulter, voter, réserver |
| `RESERVED` | Réservé | Visible ; réservation active (≤ durée param.), retour auto en `AVAILABLE` à expiration |
| `COLLECTED` | Récupéré | Validé par photo « lieu vide » |
| `PENDING_REVIEW` | En modération | Passé ici quand le seuil de signalements est atteint (voir §6.5) |
| `HIDDEN` | Masqué | Retiré de l'affichage par un modérateur/admin |
| `ARCHIVED` | Historique | Non visible en recherche active |

> Note : dans la v1.0 source, l'état « disponible » était parfois appelé
> `VISIBLE`. On retient **`AVAILABLE`** comme nom unique.

### 6.2 Réservation

**Objectif** : éviter que plusieurs personnes se déplacent pour le même objet.

- Une seule réservation active par Item à la fois.
- Durée maximale **paramétrable** (`reservation_duration_minutes`, défaut 60).
- À l'expiration, un **job automatique** (chaque minute) repasse
  `RESERVED → AVAILABLE`.
- Pendant la réservation, tous voient : « Réservé par *pseudo* — Expire dans
  X minutes ».

### 6.3 Récupération & validation

Volontairement simple. L'utilisateur récupère l'objet puis :
1. ouvre l'app ;
2. clique « J'ai récupéré ce Monstre » ;
3. prend **une photo du lieu vide**.

La photo doit permettre de confirmer que l'objet n'est plus présent et que la
position correspond. Après validation : `RESERVED → COLLECTED`
(enregistre photo, position, date).

### 6.4 Votes & réactions communautaires (esprit Dealabs)

Réaction **positive** d'engagement, réservée aux utilisateurs connectés,
qui alimente la popularité et le classement.

`votes.type` ne contient qu'une seule valeur : **`interesting`**
(« vaut le déplacement »). Tous les signaux correctifs (déjà récupéré, doublon,
faux, mauvaise localisation, contenu inapproprié) sont traités comme
**signalements** (§6.5), et non comme des votes.

### 6.5 Signalements & modération communautaire

La communauté participe au contrôle qualité. Types de signalement (`reports.type`) :
- `fake` — faux Monstre (photo trompeuse / objet absent) ;
- `wrong_location` — mauvaise localisation (GPS incorrect) ;
- `inappropriate` — contenu inapproprié (photo ou texte interdit) ;
- `duplicate` — doublon (même objet déjà publié) ;
- `already_collected` — objet déjà récupéré / plus disponible.

**Seuils** (paramétrables) :
- **Signalements « qualité »** (`fake`, `wrong_location`, `inappropriate`,
  `duplicate`) : à partir de **3 signalements distincts** (`report_threshold`),
  l'Item passe `AVAILABLE → PENDING_REVIEW`. Un modérateur décide alors :
  conserver, masquer, supprimer, sanctionner.
- **`already_collected`** : signal spécifique de « l'objet n'est plus là ».
  À partir du seuil `already_collected_threshold` (défaut 3), l'Item est
  automatiquement **`ARCHIVED`** (retiré de la recherche active). On ne le passe
  **pas** en `COLLECTED` : ce statut est réservé à une vraie récupération validée
  par un utilisateur avec photo du lieu vide.

**Sanctions utilisateur** (faux signalement avéré, etc.), niveaux évolutifs :
avertissement → limitation → bannissement temporaire (défaut 1re sanction :
24 h) → bannissement définitif.

### 6.6 Commentaires

Système simple : un utilisateur connecté peut commenter un Monstre
(« Je passe ce soir », « Encore là à 18 h », « Il faut être deux »…).
Admin : suppression et signalement de commentaire.

### 6.7 Catégories (administrables)

Optionnelles à la création. CRUD complet côté admin (nom, icône, ordre
d'affichage ; suppression seulement si aucun Item lié).
Catégories initiales : **Meuble, Électroménager, Jardin, Bricolage, Métal,
Bois, Vélo, Décoration, Autre.**

### 6.8 Score & `trust_score` utilisateur

**Score** (gamification) : entièrement administrable, aucune valeur en dur.
Chaque action importante génère un **événement de scoring**
(`scoring_events`), ex. `USER_CREATED_ITEM`, `USER_COLLECTED_ITEM`,
`USER_RECEIVED_VOTE`. Barème par défaut (paramétrable) :

| Action | Points (défaut) |
|---|---|
| Création d'un Monstre | 5 |
| Récupération | 10 |
| Validation | 5 |
| Vote utile reçu | 1 |

**`trust_score`** (score de confiance) : valeur initiale **100**. Augmente avec
publications valides, récupérations confirmées, ancienneté ; diminue avec faux
signalements, abus, suppressions. Peut influencer visibilité, priorité et
modération.

### 6.9 Badges (configurables)

Système paramétrable, conditions configurables. Exemples :

| Badge | Condition |
|---|---|
| Premier Monstre | créer son premier Monstre |
| Explorateur | 10 créations |
| Chasseur | 50 récupérations |
| Gardien du quartier | 100 contributions |
| Ambassadeur | score élevé + forte fiabilité |

### 6.10 Abonnements géographiques (zones surveillées)

Un utilisateur peut surveiller des lieux (nom, latitude, longitude, rayon).
Limites paramétrables : **max 5 lieux**, **rayon max 5 km**. Quand un Monstre
apparaît dans une zone, envoyer un email.

### 6.11 Notifications

**V1 : email uniquement** (via Brevo). Types :
`NEW_ITEM_NEARBY`, `RESERVATION_CREATED`, `ITEM_COLLECTED`, `BADGE_UNLOCKED`.
Historique conservé en base (`notifications`). Push mobile → V2.

---

## 7. Création d'un Monstre (détails)

### Photos
- **1 minimum, 3 maximum.** Sources : appareil photo ou galerie.
- Traitement à l'import : compression automatique, génération de miniature,
  contrôle taille et format.
- Formats acceptés : **JPEG, PNG, WebP**.
- **Suppression des métadonnées EXIF sensibles** (conserver uniquement les
  infos utiles).

### Informations automatiques
Enregistrées à la création : **date**, **heure**, **position GPS**
(latitude, longitude, précision).

### Validation de la position
Le GPS pouvant être imprécis, l'utilisateur peut : accepter la position,
déplacer le marqueur, rechercher une adresse, corriger manuellement.

### Informations saisies
- **Nom** (obligatoire) — ex. « Canapé gris 3 places ».
- **Description** (optionnelle).
- **Catégorie** (optionnelle, administrable).

---

## 8. Recherche, tri & classement

### Filtres
distance, catégorie, date, popularité, statut.

### Vue liste (vue principale recommandée)
Affiche titre, distance, votes, ancienneté. Pagination obligatoire.

### Vue carte
Technologie : **Leaflet + OpenStreetMap**. Affiche la position de
l'utilisateur, les Monstres disponibles et les zones surveillées.
*(Carte optionnelle en V1 ; la liste est obligatoire.)*

### Algorithme de classement
L'ordre **ne dépend pas uniquement de la distance**. Score interne combinant :
**popularité + distance + date de création + votes + fiabilité du créateur**.
Ex. : un très beau Monstre à 3 km peut passer devant un objet banal à 100 m.
Priorité de tri par défaut : `distance` → `popularité` → `date`.

> Décision v1.1 : le score de classement est **calculé à la volée** au moment
> de la requête (pas de colonne de ranking matérialisée). Seul `votes_score`
> est dénormalisé sur l'Item.

---

## 9. Confidentialité des positions & RGPD

- **Visiteur non connecté** : zone **approximative** uniquement.
- **Utilisateur connecté** : adresse exacte.
- Cette règle est appliquée à la **sérialisation API**, pas via un champ par Item.

**RGPD** : données personnelles stockées = email, pseudo, avatar,
localisation des publications, historique. Chaque utilisateur peut :
- **télécharger ses données** (export JSON) ;
- **supprimer son compte** (profil + données personnelles), en ne conservant
  que des **données anonymisées** nécessaires aux statistiques.

**Consentements** : GPS (demande explicite), notifications (email oui/non,
notifications futures oui/non), Facebook (consentement avant publication).

---

## 10. Comptes & authentification

### Création par email
Obligatoire : email valide, **validation email**, mot de passe.
Fonctions : connexion, déconnexion, mot de passe oublié, changement d'email,
suppression du compte.

### Connexion externe
**Google Login** et **Facebook Login** dès la V1. Architecture ouverte pour
ajouter d'autres fournisseurs. Stockage dans `social_accounts`.

### Profil utilisateur
Public : pseudo, photo, date d'inscription, niveau, score, badges, nombre de
Monstres créés, nombre de Monstres récupérés.

---

## 11. Intégration Facebook

**À implémenter après validation du cœur applicatif (phase tardive).**
Objectif : lier l'app au groupe Facebook « Les Monstres ». Si l'utilisateur
est connecté via Facebook, proposer à la création : « Publier également dans
Facebook » (photo, titre, description, localisation approximative, lien app).
**Ne jamais bloquer la création d'un Monstre si Facebook échoue.**

Partage général : Facebook, lien, messagerie. Chaque Monstre a une URL
publique, ex. `https://monstres.fbc.fr/item/4587`.

---

## 12. Architecture technique

### 12.1 Stack

| Couche | Technologie |
|---|---|
| Backend | **NestJS** (dernière version stable), **Node.js LTS**, **TypeScript strict** |
| ORM | **Prisma** (SQLite V1 → PostgreSQL) |
| Auth | **JWT en cookie httpOnly** via `@nestjs/passport` (sessions web + tokens mobiles futurs) |
| Frontend | **Vue 3** + **TypeScript** + **Vite** + **Tailwind CSS** + **Pinia** |
| Base V1 | **SQLite** → migration prévue **PostgreSQL** (+ PostGIS pour la géo) |
| Carte | Leaflet + OpenStreetMap |
| Emails | Brevo API |
| Développement local | Node/npm en direct, **sans Docker** |
| Déploiement | Docker Compose sur serveur **Proxmox** |

### 12.2 Infrastructure V1

```
INTERNET → NGINX → ┌── FRONTEND (Vue.js)
                   └── API (NestJS) → SQLite → Stockage photos
```

**En développement local**, pas de Docker : le backend NestJS et le frontend
Vite tournent chacun en processus Node natif (`npm run start:dev` /
`npm run dev`), avec un fichier SQLite local. **Docker Compose n'intervient
qu'au déploiement**, sur le serveur Proxmox.

Services Docker Compose (déploiement) : `nginx` (reverse proxy), `frontend`
(Vue 3 buildé, servi statiquement), `backend` (API NestJS), `storage`
(fichiers images). La base SQLite V1 est un fichier monté en volume ; en
V2/PostgreSQL un service `database` dédié sera ajouté.

**Domaine & sous-domaines.** Le domaine racine est **`fbc.fr`**. L'application
vit sous `monstres.fbc.fr`. Les sous-domaines du frontend et de l'API doivent
partager un parent commun pour que le **cookie JWT httpOnly** fonctionne
(auth SPA cookie-based).

| Sous-domaine | Rôle | Priorité |
|---|---|---|
| `monstres.fbc.fr` | Frontend PWA (public) | requis |
| `api.monstres.fbc.fr` | API NestJS | requis |
| `img.monstres.fbc.fr` | Service des photos (statique, cache/CDN futur) | recommandé |
| `staging.monstres.fbc.fr` | Frontend de pré-production | recommandé |
| `api.staging.monstres.fbc.fr` | API de pré-production | recommandé |
| `admin.monstres.fbc.fr` | Admin (sinon route `/admin` du frontend) | optionnel |

> Développement : en local (`localhost`), pas de sous-domaine, pas de Docker —
> backend et frontend tournent en processus Node natifs sur des ports distincts.

> **Décision V1 (2026-07-21) : domaine unique en attendant les sous-domaines.**
> Seul `monstres.fbc.fr` est configuré en DNS/reverse-proxy externe pour
> l'instant. API et photos sont donc exposées sur `monstres.fbc.fr/api/` et
> `monstres.fbc.fr/uploads/` (voir `nginx/nginx.conf`) plutôt que sur
> `api.` / `img.` — simplification temporaire, pas un changement du modèle
> cible ci-dessus. Repasser aux sous-domaines dès qu'ils sont ajoutés en DNS
> ne demande qu'un changement de `nginx/nginx.conf` et des variables d'env
> (`VITE_API_URL`, `IMG_BASE_URL`), rien côté backend/frontend.

**Configuration auth associée** (prod) :
```
APP_URL=https://api.monstres.fbc.fr
JWT_COOKIE_DOMAIN=.monstres.fbc.fr
JWT_COOKIE_SECURE=true
JWT_COOKIE_SAME_SITE=lax
CORS_ORIGIN=https://monstres.fbc.fr
```

**DNS pour l'emailing (Brevo)** — sur le domaine d'envoi (`monstres.fbc.fr` ou
`fbc.fr`), ajouter les enregistrements fournis par Brevo : **SPF** (TXT),
**DKIM** (2 enregistrements), **DMARC** (TXT `_dmarc`) et le sous-domaine de
**tracking** que Brevo génère. Adresse d'expéditeur recommandée :
`no-reply@monstres.fbc.fr`.

### 12.3 Backend NestJS
Structure par domaine, un module Nest par bounded-context : `src/items`,
`src/reservations`, `src/users`, `src/reports`, etc. Dans chaque module :
`*.controller.ts`, `*.service.ts`, `*.module.ts`, `dto/` (validation
`class-validator`, équivalent Form Requests), `guards/` (équivalent
Policies). `prisma/schema.prisma` tient lieu de Models/migrations.
Tâches planifiées (ex. expiration des réservations) via `@nestjs/schedule`
(équivalent Jobs). Événements internes via `@nestjs/event-emitter`
(équivalent Events).
**Séparation métier stricte** : jamais de calcul de score, envoi de mail ou
changement de statut dans un contrôleur → passer par `ItemService`,
`ReservationService`, `ScoringService`, `NotificationService`, `ImageService`, etc.

### 12.4 Frontend Vue
Structure : `src/components`, `views`, `stores`, `services`, `router`, `assets`.
Priorités : rapidité, simplicité, expérience mobile.
**PWA** : installable (manifest, icônes, mode plein écran, cache des ressources).

### 12.5 Base de données
SQLite en V1 (simple, adapté au démarrage, facile à sauvegarder).
**Ne jamais utiliser de fonctionnalités SQLite spécifiques** qui empêcheraient
la migration vers PostgreSQL. Recherche par distance : calcul côté serveur en
V1, **PostGIS** ensuite.

### 12.6 API REST
Toutes les fonctions passent par l'API, préfixe **`/api/v1/`**.

Réponses JSON standardisées :
```json
{ "success": true, "data": {}, "message": "" }
```
```json
{ "success": false, "error": { "code": "", "message": "" } }
```

Exemples d'endpoints :
```
POST /api/v1/register        POST /api/v1/login        POST /api/v1/logout
GET  /api/v1/items           GET  /api/v1/items/{id}
POST /api/v1/items           PUT  /api/v1/items/{id}
POST /api/v1/items/{id}/reserve
POST /api/v1/items/{id}/collect
POST /api/v1/items/{id}/vote
```

### 12.7 Sécurité
Validation des entrées (DTO + `class-validator`), protection CSRF, limitation
de requêtes (rate limit via `@nestjs/throttler`), contrôle des fichiers
uploadés (taille, extension, MIME type ; antivirus possible plus tard),
permissions (Guards), logs.

### 12.8 Gestion des images
Service dédié **`ImageService`** (upload, compression, miniature, suppression).
**Ne jamais manipuler les fichiers directement dans les contrôleurs.**

### 12.9 Emails (Brevo)
Compte : validation email, bienvenue, changement d'email, mot de passe oublié.
Communauté : nouveau Monstre proche, réservation, récupération, badge gagné.

### 12.10 Paramètres administrables (`settings`)
Tous les paramètres importants sont en base. Exemples :
```
reservation_duration_minutes = 60
max_photos_per_item          = 3
max_user_subscriptions       = 5
max_subscription_radius      = 5000   # mètres
report_threshold             = 3
already_collected_threshold  = 3
points_creation              = 5
points_recuperation          = 10
points_validation            = 5
points_vote_utile            = 1
```

### 12.11 IA future (emplacement réservé)
Prévoir un `ImageAnalysisService` **non connecté** en V1
(Photo → analyse IA → suggestion de catégorie → validation utilisateur).

---

## 13. Modèle de données

> Toutes les tables incluent `id`. Timestamps standard Prisma (`createdAt` /
> `updatedAt`) sauf mention contraire. FK explicites. Colonnes consolidées à
> partir des §18/§43 de la v1.0.

### `users`
`id, name, email, password, avatar, email_verified_at, role, score,
trust_score, created_at, updated_at`

### `social_accounts`
`id, user_id, provider, provider_id, token, created_at`

### `items` (les Monstres)
`id, user_id, category_id (nullable), title, description (nullable),
latitude, longitude, address (nullable), status, views, votes_score,
reserved_at (nullable), collected_at (nullable), created_at, updated_at`

### `item_photos`
`id, item_id, type, path, thumbnail_path, order, created_at`
> `type` distingue les photos d'annonce des photos de validation de
> récupération (voir §20-Q2).

### `categories`
`id, name, icon, order, active, created_at`

### `reservations`
`id, item_id, user_id, status, created_at, expires_at`

### `votes`
`id, item_id, user_id, type, created_at`

### `comments`
`id, item_id, user_id, content, created_at`

### `subscriptions` (zones surveillées)
`id, user_id, name, latitude, longitude, radius, active, created_at`

### `notifications`
`id, user_id, type, data, read_at, created_at`

### `badges`
`id, name, description, icon, condition, active`

### `user_badges`
`id, user_id, badge_id, created_at`

### `scoring_events`
`id, user_id, item_id (nullable), type, points, created_at`

### `reports` (signalements)
`id, item_id, user_id, type, reason, status, created_at`

### `settings`
`id, key, value, type, updated_at`

### `audit_logs`
`id, user_id, action, data, created_at`

---

## 14. Administration

Espace complet permettant de **piloter l'app sans modifier le code**.

- **Dashboard** : utilisateurs inscrits/actifs, nouveaux Monstres, récupérés,
  taux de récupération, signalements, espace disque.
- **Utilisateurs** : recherche (pseudo/email/date/score), voir profil,
  modifier, suspendre, bannir, supprimer ; historique publications,
  signalements reçus, score de confiance.
- **Monstres** : recherche multi-critères ; masquer, supprimer, changer statut,
  voir historique.
- **Catégories** : CRUD (nom, icône, ordre ; suppression si aucun Item lié).
- **Paramètres** (`settings`) : modifiables sans déploiement.
- **Scoring** : barème modifiable sans déploiement.
- **Badges** : création avec conditions configurables.
- **Signalements** : file de modération, seuil, décisions.
- **Statistiques** : global (croissance, publications/jour, récupérations,
  villes actives), géographique (carte de chaleur, zones actives), utilisateurs
  (meilleurs contributeurs/récupérateurs).

---

## 15. Conventions de code

**Backend** : ESLint + Prettier, conventions NestJS, Services, DTO
(`class-validator`), Guards.
**Frontend** : TypeScript strict, composants réutilisables, stores Pinia,
Composition API.
**Documentation** : à chaque module, README + commentaires utiles +
documentation API.

---

## 16. Qualité, exploitation, RGPD technique

- **Tests** — backend : authentification, création, réservation, validation de
  récupération, scoring. Frontend : navigation, formulaires, responsive.
- **Performance** — affichage < 2 s : compression images, cache, pagination,
  chargement progressif.
- **Gestion des erreurs** — toujours : message utilisateur clair + log
  technique + récupération possible (ex. `IMAGE_UPLOAD_FAILED` →
  « Impossible d'envoyer la photo. Réessayez. »).
- **Logs** — erreurs, connexions, actions administrateur, sanctions.
- **Sauvegardes** — quotidiennes : base, photos, configuration ; tester
  régulièrement la restauration.
- **Environnements** — `development`, `staging`, `production`.
- **Variables d'environnement** (`.env`) — `DATABASE_URL`, `BREVO_API_KEY`,
  `FACEBOOK_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `APP_URL`, …

---

## 17. Plan de développement incrémental

> Chaque phase produit une version fonctionnelle et testée avant de passer à la
> suivante.

**Phase 0 — Initialisation.** Dépôt Git, environnement de dev local sans
Docker, NestJS, Prisma, Vue, Tailwind, TypeScript, SQLite. Livrables :
`docker-compose.yml` (prêt pour le déploiement Proxmox, non utilisé en dev),
`.env.example`, `README.md`, structure complète. Validation locale :
`npm run start:dev` (backend) et `npm run dev` (frontend) démarrent tous les
deux sans erreur.

**Phase 1 — Authentification.** Inscription email, validation email, connexion,
déconnexion, mot de passe oublié, profil. Tables `users`, `social_accounts`.
Pages `/login`, `/register`, `/profile`. Tests : création compte, email envoyé,
connexion, accès protégé.

**Phase 2 — Création des Monstres.** Formulaire en 4 étapes (photo → position →
informations → publication). Tables `items`, `item_photos`, `categories`.
Tests : Monstre complet (photos, coordonnées, propriétaire).

**Phase 3 — Consultation.** Liste des Monstres proches (obligatoire), carte
(optionnelle V1). Tri : distance → popularité → date. Tests : classement,
pagination, filtres.

**Phase 4 — Réservation.** Réserver, afficher, expiration automatique. Table
`reservations`. Job chaque minute : expirations `RESERVED → AVAILABLE`.
Tests : réservation, expiration, nouvelle disponibilité.

**Phase 5 — Validation de récupération.** « J'ai récupéré ce Monstre » : photo
finale, validation, changement de statut `RESERVED → COLLECTED`.

**Phase 6 — Système communautaire.** `votes`, `comments`, score utilisateur via
`scoring_events` (chaque action importante génère un événement).

**Phase 7 — Notifications.** Email uniquement. Table `notifications`. Types
`NEW_ITEM_NEARBY`, `RESERVATION_CREATED`, `ITEM_COLLECTED`, `BADGE_UNLOCKED`.
Via Brevo.

**Phase 8 — Abonnements géographiques.** Table `subscriptions` (nom, position,
rayon). Limites : `max_subscriptions = 5`, `max_radius = 5000 m`.

**Phase 9 — Administration.** Dashboard + gestion utilisateurs, Monstres,
catégories, paramètres, signalements.

**Phase 10 — Modération.** Table `reports`. Workflow : signalement → compteur →
seuil atteint → `PENDING_REVIEW` → décision modérateur.

**Phase 11 — Facebook.** Après validation du cœur. Connexion + publication
automatique. Ne jamais bloquer la création si Facebook échoue.

---

## 18. Roadmap produit

**V1 (MVP)** — application fonctionnelle locale : comptes, création Monstre,
photos, GPS, liste par distance, réservation, récupération, votes, emails,
administration.

**V2** — apps mobiles iOS/Android, notifications push, meilleure
géolocalisation, mode hors connexion.

**V3** — IA reconnaissance photo, détection automatique de doublons, classement
des villes, événements communautaires, challenges, récompenses.

---

## 19. Checklist avant livraison V1

**Technique** : ☐ Docker fonctionne ☐ installation documentée
☐ sauvegardes fonctionnelles ☐ logs actifs

**Utilisateur** : ☐ création compte ☐ publication Monstre ☐ recherche proche
☐ réservation ☐ récupération ☐ votes ☐ notifications

**Administration** : ☐ dashboard ☐ gestion utilisateurs ☐ gestion contenus
☐ paramètres configurables

---

## 20. Décisions tranchées (incohérences de la v1.0 résolues)

Ces points étaient flous ou contradictoires dans la v1.0 ; ils sont désormais
arbitrés.

- **Votes vs Signalements.** `votes` = uniquement `interesting` (positif) ;
  tous les signaux correctifs vont dans `reports`. « Déjà récupéré »
  (`already_collected`) est un signalement : au seuil, l'Item passe en
  `ARCHIVED` (pas `COLLECTED`). Voir §6.4 / §6.5.
- **Photo de validation de récupération.** Stockée dans `item_photos` avec un
  champ `type` (`listing` / `collection`), pas de table séparée.
- **Enum `status`.** `AVAILABLE, RESERVED, COLLECTED, PENDING_REVIEW, HIDDEN,
  ARCHIVED` (l'ancien `VISIBLE` = `AVAILABLE`).
- **Domaine.** Racine `fbc.fr`, application sous `monstres.fbc.fr`
  (sous-domaines détaillés en §12.2).
- **Score de classement.** Calculé à la volée (pas de colonne matérialisée) ;
  seul `votes_score` est dénormalisé sur l'Item.
- **Table `items` & rôles.** Colonnes fusionnées à partir des §18/§43
  contradictoires ; ajout d'une colonne `role` sur `users` (3 rôles admin
  décrits mais absents du modèle v1.0).

---

## Philosophie finale

Les Monstres doit être développé comme une **plateforme durable**. Priorités,
dans l'ordre : **simplicité utilisateur, communauté, fiabilité, évolutivité.**
Chaque choix technique doit permettre au projet de grandir jusqu'à une
plateforme communautaire nationale.
