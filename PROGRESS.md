# Suivi de développement — Les Monstres

> Fichier de reprise de contexte. À lire par toute IA/dev qui reprend le
> projet. Mettre à jour ce fichier à chaque session (cocher les cases,
> ajouter des décisions, déplacer les tâches terminées).
>
> Référence fonctionnelle complète : [`LES_MONSTRES_cahier_des_charges.md`](./LES_MONSTRES_cahier_des_charges.md)
> Règles non négociables : [`CLAUDE.md`](./CLAUDE.md)

Dernière mise à jour : **2026-07-22** (correctif carte + masquage Monstres
récupérés >24h, v0.1.4)

**Statut : Phases 0 à 8 terminées et validées.** Prochaine étape :
**Phase 9 — Administration** (voir détail plus bas). Le projet est déployé
en production sur `https://monstres.fbc.fr` (domaine unique, voir la
section dédiée plus bas pour l'historique des correctifs de déploiement).

Note : l'utilisateur a commencé à renseigner `GOOGLE_CLIENT_ID` dans
`.env.example` (racine) — signal qu'il prépare le login Google (§10,
reporté depuis la Phase 1 faute d'identifiants). Ne pas construire le
login Google tant qu'il n'a pas explicitement demandé de le faire.

Comptes de test locaux existants dans `backend/dev.db` (non versionné) :
`marc@fbc.fr` (ADMIN, créé par l'utilisateur) et `admin@monstres.local`
(ADMIN, créé cette session — mot de passe donné par l'utilisateur en chat,
non répété ici). Plusieurs Monstres de test ont été créés pendant les
sessions Phase 2 (photos réelles sur disque dans `backend/storage/items/`).

---

## Décisions prises pendant cette session (à connaître avant de continuer)

1. **Stack backend changée : Laravel/PHP → NestJS/TypeScript/Prisma.**
   Décision utilisateur du 2026-07-21. `CLAUDE.md` et le cahier des charges
   ont été mis à jour en conséquence (§0, §12, §15, §17 notamment). **Ne pas
   revenir à Laravel/PHP sans revalider avec l'utilisateur.**
   - Framework : **NestJS** (modules/services/controllers/guards).
   - ORM : **Prisma 7** (attention : Prisma 7 a un fonctionnement différent
     des versions <7, voir point 3 ci-dessous).
   - Auth prévue : **JWT en cookie httpOnly** via `@nestjs/passport`
     (remplace Laravel Sanctum). Cookie `Domain=.monstres.fbc.fr` en prod.
2. **Pas de Docker en développement local.** Docker Compose est réservé au
   déploiement sur le serveur Proxmox de l'utilisateur. En local, tout tourne
   en processus Node natifs (`npm run start:dev`, `npm run dev`). Raison :
   PHP/Composer/Docker/WSL ne sont pas installés sur la machine de dev
   Windows utilisée.
3. **Prisma 7 nécessite un adaptateur de driver.** Le générateur classique
   `prisma-client-js` n'existe plus tel quel ; on utilise `prisma-client`
   avec `moduleFormat = "cjs"` (sinon le client généré est en ESM pur et
   casse la compilation CommonJS de NestJS — erreur `import.meta` invalide).
   Pour SQLite : `@prisma/adapter-libsql` + `@libsql/client`, **pas**
   `@prisma/adapter-better-sqlite3` (celui-ci nécessite une compilation
   native via `node-gyp`/Visual Studio Build Tools, absents sur cette
   machine → échec d'installation). Voir `backend/prisma/schema.prisma` et
   `backend/src/prisma/prisma.service.ts`.
4. Toutes les décisions d'architecture doivent respecter les règles d'or de
   `CLAUDE.md` (vocabulaire Item/Monstre, rien de en dur dans `settings`,
   logique métier dans des Services, jamais dans les contrôleurs, etc.)

---

## Où on en est — Phase 0 (Initialisation)

Objectif de la phase (cahier des charges §17) : dépôt Git, environnement de
dev local sans Docker, NestJS + Prisma + Vue + Tailwind + TypeScript +
SQLite, `docker-compose.yml` (pour Proxmox), `.env.example`, `README.md`.
Validation : `npm run start:dev` (backend) et `npm run dev` (frontend)
démarrent tous les deux sans erreur.

### Fait
- [x] Dépôt Git initialisé (`git init`), premier commit avec `CLAUDE.md` +
      cahier des charges mis à jour + `.gitignore` racine.
- [x] `CLAUDE.md` et `LES_MONSTRES_cahier_des_charges.md` réécrits pour la
      stack NestJS/Prisma (voir décisions ci-dessus).
- [x] Backend NestJS scaffoldé dans `backend/` (`nest new`).
- [x] Dépendances backend installées : `@nestjs/config`, `@nestjs/jwt`,
      `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser`,
      `class-validator`, `class-transformer`, `@nestjs/throttler`,
      `@nestjs/schedule`, `@nestjs/event-emitter`, `bcrypt`,
      `@prisma/client`, `prisma`, `@prisma/adapter-libsql`, `@libsql/client`.
- [x] `backend/prisma/schema.prisma` : modèle de données complet du §13
      (User, SocialAccount, Category, Item, ItemPhoto, Reservation, Vote,
      Comment, Subscription, Notification, Badge, UserBadge, ScoringEvent,
      Report, Setting, AuditLog + tous les enums de statut).
- [x] Première migration Prisma appliquée (`prisma migrate dev --name init`)
      → `backend/dev.db` (SQLite local, non versionné).
- [x] `backend/src/prisma/` : `PrismaService` (branché sur l'adaptateur
      libsql) + `PrismaModule` (global).
- [x] `backend/src/health/` : `GET /api/v1/health` (vérifie la connexion DB).
- [x] `backend/src/common/` : `ResponseInterceptor` (standardise
      `{ success, data, message }`) et `HttpExceptionFilter` (standardise
      `{ success:false, error:{ code, message } }`), conformes au §12.6.
- [x] `backend/src/main.ts` : préfixe global `/api/v1`, CORS avec
      credentials, `cookie-parser`, `ValidationPipe` global.
- [x] `backend/src/app.module.ts` : `ConfigModule`, `ThrottlerModule` (+
      guard global), `ScheduleModule`, `EventEmitterModule`, `PrismaModule`,
      `HealthModule`.
- [x] Backend testé manuellement : `npm run build` compile sans erreur,
      `npm run start` démarre et `GET /api/v1/health` répond
      `200 { success:true, data:{ status:"ok", database:"connected" } }`.
- [x] `backend/.env`, `backend/.env.example`, `backend/README.md`,
      `backend/.gitignore` écrits.

### Restant à faire — Phase 0
- [x] **Commit Git du backend** (commit `2fdc9c5`).
- [x] **Scaffolder le frontend** : Vue 3 + TypeScript strict + Vite +
      Tailwind CSS v4 (`@tailwindcss/vite`) + Pinia + Vue Router, en PWA
      (`vite-plugin-pwa`), dans `frontend/`. Structure : `src/components`
      (dont `layout/BottomNav.vue`), `views` (Home/Map/AddItem/Alerts/
      Profile, placeholders indiquant leur phase), `stores` (`auth.ts`
      placeholder), `services/api.ts` (client axios `/api/v1`, cookies),
      `router`. Alias `@` → `src/`. Testé : `vue-tsc --noEmit` sans erreur,
      `npm run dev` démarre sur :5173, page vérifiée dans le navigateur
      (rendu correct, 0 erreur console, 0 requête en échec). Icônes PWA =
      placeholder SVG à remplacer lors du travail de branding.
- [x] **`docker-compose.yml`** à la racine : services `nginx` (reverse proxy
      de façade, `nginx/nginx.conf`, un `server{}` par sous-domaine),
      `frontend` (build multi-stage → nginx statique, `frontend/Dockerfile` +
      `frontend/nginx.conf`), `backend` (build multi-stage, `backend/Dockerfile`,
      lance `prisma migrate deploy` puis `node dist/main.js`), `storage`
      (nginx statique sur un volume partagé avec le backend, sert
      `img.monstres.fbc.fr`, `storage/nginx.conf`). Volumes nommés
      `backend_data` (SQLite) et `storage_data` (photos). **Non testé avec
      un vrai moteur Docker** (absent de la machine de dev) — seule la
      cohérence des fichiers a été relue manuellement. TLS non géré par
      `nginx/nginx.conf`, à terminer côté Proxmox avant prod.
      ⚠️ **À valider réellement au premier déploiement.**
- [x] **`.env.example` racine** (variables de déploiement Docker :
      `DATABASE_URL` pointant vers `/app/data`, domaines prod, secrets JWT/
      OAuth/Brevo, `VITE_API_URL` en build-arg frontend) — distinct de
      `backend/.env.example` et `frontend/.env.example` (dev local).
- [x] **`README.md` racine** : vue d'ensemble, démarrage local sans Docker,
      déploiement Docker/Proxmox.
- [x] **Validation locale (sans Docker)** : backend (`npm run start:dev`) ET
      frontend (`npm run dev`) démarrent simultanément sans erreur ; healthcheck
      API et page frontend vérifiés. **C'est le critère de validation retenu
      pour la Phase 0** (le cahier des charges original visait `docker compose
      up`, adapté suite à la décision « pas de Docker en local », voir
      décisions de session).
- [x] **Fix build backend** : `prisma generate` sort désormais dans
      `src/generated/prisma` (et non `../generated/prisma`) pour que
      `nest build` produise un `dist/main.js` à plat (compatible
      `npm run start:prod` / `CMD` Docker). `prisma.config.ts` exclu de la
      compilation Nest (`tsconfig.build.json`) — inutile au runtime, seul le
      CLI Prisma le lit directement.

---

## Phase 1 — Authentification : terminée et validée

Objectif (§17) : inscription email, validation email, connexion,
déconnexion, mot de passe oublié, profil. Tables `users`, `social_accounts`.
Pages `/login`, `/register`, `/profile`. Tests : création compte, email
envoyé, connexion, accès protégé.

### Décisions prises pendant cette session
- **JWT simple, sans refresh token.** Un seul cookie httpOnly
  (`access_token`, 7 jours par défaut) signé avec `JWT_SECRET`. Pas de
  refresh token séparé ni de table de révocation : plus simple, suffisant
  pour le V1. Si un vrai besoin de révocation apparaît (session courte +
  refresh long pour mobile), à ajouter en V2 sans bloquer maintenant.
  `backend/.env.example` a été simplifié en conséquence (`JWT_EXPIRES_IN`
  au lieu de `JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN`).
- **Inscription = connexion automatique.** Cohérent avec l'exigence UX
  « créer un compte/Monstre en moins de 30 s » — pas de blocage en attendant
  la validation email. L'utilisateur reste `emailVerifiedAt: null` jusqu'à
  clic sur le lien (ou validation manuelle admin, voir plus bas) ; rien
  n'est bloqué derrière cette vérification pour l'instant (à revoir si le
  produit veut restreindre certaines actions aux emails vérifiés).
- **Module `settings` construit dès maintenant** (pas juste pour l'auth) :
  `SettingsService.getString/getNumber/getBoolean(key, fallback)` lit la
  table `settings`, seedée via `npm run prisma:seed`
  (`backend/scripts/seed.js`) avec toutes les valeurs par défaut du §12.10
  **plus** les TTL des tokens auth (`email_verification_token_ttl_hours=24`,
  `password_reset_token_ttl_minutes=60`). Toutes les phases suivantes
  (réservation, seuils de signalement, points de scoring…) doivent lire
  leurs valeurs via ce service, jamais en dur.
- **Module `email` (Brevo) avec fallback dev.** `EmailService.send()` logge
  en console (niveau `warn`, lien complet inclus) si `BREVO_API_KEY` est
  absent, au lieu d'échouer — permet de développer et tester tout le flux
  auth sans compte Brevo. Voir `backend/README.md` section Emails.
  L'envoi d'email ne bloque jamais l'inscription/le mot de passe oublié
  (erreur catchée et loggée), même esprit que la règle Facebook du §11.
- **Endpoint admin de validation d'email manuelle**, demandé explicitement
  par l'utilisateur : `PATCH /api/v1/admin/users/:id/verify-email`, protégé
  par `JwtAuthGuard` + `RolesGuard` (`ADMIN`/`SUPER_ADMIN` uniquement). Vit
  dans `src/admin/` (préfixe `admin/users`), pensé pour préfigurer la
  Phase 9 sans construire toute l'admin maintenant. **Aucun compte admin
  n'existe par défaut** : pour promouvoir un compte après inscription,
  ouvrir `npm run prisma:studio` et changer la colonne `role` sur
  `ADMIN`/`SUPER_ADMIN` (documenté dans `backend/README.md`) — une vraie UI
  viendra en Phase 9. Le rôle est embarqué dans le JWT à la connexion :
  après une promotion, l'utilisateur doit se reconnecter pour que le nouveau
  rôle soit pris en compte.
- **Google/Facebook Login reportés** (décision utilisateur) : nécessitent
  des identifiants OAuth que seul l'utilisateur peut créer sur les consoles
  Google/Meta. L'architecture reste ouverte (table `social_accounts` déjà
  dans le schéma) ; à implémenter dans une passe dédiée une fois les
  identifiants disponibles.
- **`prisma migrate dev` ne fonctionne pas dans un terminal non
  interactif** (agent automatisé) dès qu'il y a un warning de contrainte
  unique, même sur une base vide — Prisma refuse purement et simplement.
  Workaround utilisé et documenté dans `backend/README.md` :
  `prisma migrate diff --from-migrations ... --to-schema ... --script` pour
  générer le SQL, l'écrire à la main dans un nouveau dossier
  `prisma/migrations/<horodatage>_<nom>/migration.sql`, puis
  `prisma migrate deploy` (non interactif) pour l'appliquer. **Réutiliser ce
  workaround pour toutes les migrations futures faites par une IA en
  session non interactive.**
- **Seed non exécutable via `ts-node` directement** : le client Prisma
  généré (`moduleFormat=cjs`) référence ses propres fichiers internes avec
  des specifiers `.js` (convention `nodenext`), que `ts-node` ne résout pas
  tant qu'ils n'ont pas été réellement compilés. Solution : `scripts/seed.js`
  est un script **JS pur** qui `require()` le client compilé dans `dist/` ;
  `npm run prisma:seed` build automatiquement avant de le lancer.

### Fait
- [x] Schéma Prisma étendu : `emailVerificationToken`/`ExpiresAt`,
      `passwordResetToken`/`ExpiresAt` sur `User` (migration
      `20260721180000_add_auth_tokens`).
- [x] `src/settings/` : `SettingsService` + `SettingsModule` (global).
      `backend/scripts/seed.js` + `npm run prisma:seed`.
- [x] `src/email/` : `EmailService` (Brevo, fallback log dev) +
      `EmailModule` (global). `sendEmailVerification`, `sendPasswordReset`.
- [x] `src/auth/` : `AuthService`, `AuthController`, `AuthModule`,
      `JwtStrategy` (lit le cookie), `JwtAuthGuard`, `RolesGuard` +
      `@Roles()`, `@CurrentUser()`. DTOs validés (`class-validator`) :
      `RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `ResetPasswordDto`.
      Routes : `POST /auth/register`, `POST /auth/login`,
      `POST /auth/logout`, `GET /auth/verify-email?token=`,
      `POST /auth/forgot-password`, `POST /auth/reset-password`,
      `GET /auth/me` (protégé).
- [x] `src/users/` : `UsersService` (`toSafeUser`, `findSafeById`,
      `findPublicProfile`), `UsersController` (`GET /users/:id`, profil
      public sans email ni trustScore).
- [x] `src/admin/` : `AdminUsersController`/`AdminUsersService`
      (`PATCH /admin/users/:id/verify-email`, rôles `ADMIN`/`SUPER_ADMIN`).
- [x] Backend testé de bout en bout en local (curl + cookies) : register →
      cookie posé → `/auth/me` 200 → email loggé en dev → verify-email →
      logout → `/auth/me` 401 → login → forgot-password (anti-énumération
      vérifiée : même message compte existant/inexistant) → reset-password
      → login avec le nouveau mot de passe → profil public sans champs
      privés → promotion `ADMIN` via Prisma → reconnexion → action admin
      `verify-email` acceptée (403 avant promotion, 200 après).
- [x] Frontend : `src/services/auth.ts` (appels API typés),
      `src/stores/auth.ts` (`init`, `register`, `login`, `logout`, état
      `loading`/`error`), vues `LoginView`, `RegisterView`,
      `ForgotPasswordView`, `ResetPasswordView`, `VerifyEmailView`,
      `ProfileView` (adaptatif connecté/non connecté). Routes ajoutées :
      `/connexion`, `/inscription`, `/mot-de-passe-oublie`,
      `/reinitialiser-mot-de-passe`, `/verifier-email`. Guard global
      `router.beforeEach` qui restaure la session via `/auth/me` une fois
      au chargement de l'app.
- [x] Testé dans le navigateur (Chrome via Claude Browser) : inscription →
      redirection profil → déconnexion → mauvais mot de passe (message
      d'erreur affiché) → bon mot de passe → session persistée après un
      rechargement complet de la page. Zéro erreur console/réseau.

### Restant / reporté (hors scope de cette session)
- [ ] Google Login / Facebook Login (§10) — en attente des identifiants
      OAuth côté utilisateur.
- [ ] Changement d'email, suppression de compte (§10) — pas couverts par les
      critères de validation du §17 pour la Phase 1 ; à ajouter si besoin
      avant de passer à la Phase 2, ou plus tard.
- [ ] Tests automatisés (Jest) pour le module `auth` — la validation de
      cette session est manuelle (curl + navigateur). §16 recommande des
      tests backend sur l'authentification.

---

## Phase 2 — Création des Monstres : terminée et validée

Objectif (§17) : formulaire en 4 étapes (photo → position → informations →
publication). Tables `items`, `item_photos`, `categories`. Tests : Monstre
complet (photos, coordonnées, propriétaire).

### Décisions prises pendant cette session
- **Position choisie via carte Leaflet + recherche d'adresse dès la
  création**, pas seulement en Phase 3. Le §7 décrit explicitement
  « accepter la position, déplacer le marqueur, rechercher une adresse,
  corriger manuellement » comme faisant partie du flux de création — ce
  n'est pas la même chose que la Phase 3 (« Consultation »), qui porte sur
  la liste/carte de *navigation* parmi les Monstres existants. Géolocalisation
  navigateur (`navigator.geolocation`) pour la position initiale, marqueur
  Leaflet déplaçable, recherche d'adresse via l'API Nominatim
  (OpenStreetMap, gratuite, sans clé) avec debounce 400 ms.
- **Règle vie privée du §9 implémentée dès maintenant**, pas reportée à la
  Phase 3, car elle porte sur la sérialisation de l'endpoint `GET /items/:id`
  qu'on construit ici : visiteur non connecté → `address: null` +
  latitude/longitude arrondies à 2 décimales (~1,1 km) ; connecté → position
  exacte. Nouveau `OptionalJwtAuthGuard` (`backend/src/auth/guards/`) : comme
  `JwtAuthGuard` mais ne renvoie jamais 401, `request.user` vaut `null` sans
  cookie valide. Réutilisable pour tout endpoint dont le contenu varie
  visiteur/connecté (utile dès la Phase 3 pour la liste).
- **`GET /items/:id` ajouté**, bien que la liste complète (`GET /items` avec
  pagination/tri/filtres) reste explicitement Phase 3. Nécessaire pour
  vérifier qu'un Monstre complet est bien persisté (critère de test du §17)
  et pour la sérialisation ci-dessus ; ne construit pas la liste/pagination
  en avance.
- **Pas de scoring à la création.** Le §6.8 (`USER_CREATED_ITEM`,
  `scoring_events`) est explicitement Phase 6 (« Système communautaire »).
  Créer un Monstre en Phase 2 n'attribue donc encore aucun point — à
  brancher en Phase 6 sans revenir sur ce module.
- **ImageService** : `sharp` (pas de dépendance native problématique comme
  `better-sqlite3` en Phase 0 — binaires précompilés OK sur cette machine).
  Toutes les photos sont converties en **WebP**, redimensionnées (max
  1920 px, `fit: inside`, jamais agrandies), une miniature 400 px est générée
  en plus. `.rotate()` corrige l'orientation EXIF *avant* que sharp ne
  supprime les métadonnées par défaut (aucun appel à `.withMetadata()`) —
  ça satisfait à la fois « suppression des métadonnées EXIF sensibles » et
  le bon rendu visuel malgré la suppression.
- **Stockage local file-based**, pas de service cloud. `STORAGE_PATH`
  (`./storage` en dev, `/app/storage` en Docker — le volume `storage_data`
  existe déjà depuis la Phase 0) + `IMG_BASE_URL` pour construire les URLs
  complètes des photos dans les réponses API. En dev, le backend sert
  lui-même les fichiers via `app.useStaticAssets()` sur `/uploads/` (NestJS
  `NestExpressApplication`) ; en prod, c'est le conteneur `storage` (nginx)
  qui sert `img.monstres.fbc.fr` depuis le même volume — le backend n'a pas
  besoin de servir de statique en prod mais ça ne coûte rien de le garder actif.
- **`itemId` généré côté service** (`randomUUID()`) *avant* la création en
  base, pas laissé à Prisma (`@default(cuid())` reste le défaut du schéma
  mais on le surcharge à la création). Ça permet d'avoir un seul identifiant
  cohérent entre le dossier de stockage des photos (`storage/items/<id>/`)
  et la ligne `Item`, sans étape de renommage après coup. Risque résiduel
  accepté : si le traitement d'image échoue *après* l'écriture disque mais
  *avant* la création en base, des fichiers orphelins peuvent rester sur
  disque (pas de ligne DB correspondante) — impact nul en pratique, à
  nettoyer via un futur job si ça devient un problème réel.
- **Limite de photos à deux niveaux** : plafond technique en dur dans
  l'intercepteur multer (10 fichiers, 10 Mo/fichier — protection anti-abus,
  pas une règle métier), et limite métier réelle (`max_photos_per_item`,
  défaut 3) lue via `SettingsService` dans `ItemsService` — conforme à la
  règle d'or « aucune règle métier en dur ».
- **Catégories initiales seedées** (§6.7 : Meuble, Électroménager, Jardin,
  Bricolage, Métal, Bois, Vélo, Décoration, Autre) dans
  `backend/scripts/seed.js`, en plus des `settings` déjà seedés en Phase 1.
- **Bug trouvé et corrigé pendant les tests navigateur** : la carte Leaflet
  ne s'initialisait pas (aucune tuile, aucun conteneur `.leaflet-container`
  dans le DOM) parce que `requestAnimationFrame` se déclenchait avant que
  Vue ait effectivement monté le `<div ref="mapContainer">` de l'étape 2
  (le `v-else-if` venait de basculer). Remplacé par
  `await nextTick()` (Vue) avant `initMap()` dans
  `frontend/src/views/AddItemView.vue`. **Leçon pour la suite : toujours
  utiliser `nextTick()` de Vue, jamais `requestAnimationFrame` seul, pour
  attendre qu'un élément conditionnel (`v-if`/`v-else-if`) soit monté avant
  d'y brancher une lib DOM tierce (Leaflet, Chart.js, etc.).**
- **Note opérationnelle (tests de session)** : passer des caractères
  accentués (`é`, `ç`) dans des arguments `curl` inline sur cette machine
  Windows/Git Bash les corrompt silencieusement (encodage de la console),
  alors que les mêmes caractères passés via un fichier
  (`curl --data-binary @fichier.json`, ou `-F "champ=<fichier.txt"`)
  arrivent intacts. Le comportement de l'application était correct dans les
  deux cas — c'était uniquement un artefact de test. **Pour toute IA qui
  teste au clavier via curl sur cette machine : préférer un fichier UTF-8
  aux arguments inline dès qu'il y a des caractères accentués.**

### Fait
- [x] `src/categories/` : `CategoriesService`/`CategoriesController`
      (`GET /categories`, actives triées par `order`). Seed des 9 catégories
      initiales.
- [x] `src/images/` : `ImageService` (`sharp` — compression WebP,
      redimensionnement, miniature, suppression EXIF, validation format
      JPEG/PNG/WebP).
- [x] `src/items/` : `ItemsService`/`ItemsController`. `POST /items`
      (multipart, `JwtAuthGuard`, DTO `CreateItemDto` avec coercition
      `class-transformer` pour lat/lng). `GET /items/:id`
      (`OptionalJwtAuthGuard`, règle vie privée §9).
- [x] `main.ts` : `useStaticAssets` pour servir `/uploads/` en dev
      (`NestExpressApplication`).
- [x] Frontend : `src/services/categories.ts`, `src/services/items.ts`
      (`createItem` en `FormData`/multipart), `AddItemView.vue` (formulaire 4
      étapes complet : photos avec aperçus/suppression, carte Leaflet +
      géolocalisation + recherche d'adresse Nominatim, infos, récapitulatif +
      publication), route `/ajouter` protégée (`meta: { requiresAuth }`,
      redirection vers `/connexion?redirect=...` puis retour automatique
      après connexion).
- [x] Testé de bout en bout : backend via curl (création multipart avec
      vraie photo JPEG → conversion WebP + miniature confirmées sur disque,
      champs UTF-8 avec accents vérifiés, règle vie privée §9 vérifiée avec
      et sans cookie) ; **navigateur réel** (Chrome via Claude Browser) :
      connexion → upload photo (injectée en JS via `DataTransfer` faute de
      pouvoir piloter le sélecteur de fichier natif depuis l'outil de
      browser automation) → carte + géolocalisation + recherche d'adresse
      Nominatim (résultats réels, sélection fonctionnelle) → infos +
      catégorie → récapitulatif → publication → confirmation affichée. Zéro
      erreur console/réseau après correction du bug Leaflet.

### Restant / reporté (hors scope de cette session)
- [ ] Tests automatisés (Jest) pour `items`/`images`/`categories` — validation
      manuelle uniquement cette session.
- [ ] Vraies icônes de catégories (actuellement des noms de clé texte comme
      `sofa`, `hammer` — à mapper vers un jeu d'icônes réel côté frontend).

---

## Phase 3 — Consultation : terminée et validée

Objectif (§17) : liste des Monstres proches (obligatoire), carte
(optionnelle). Tri : distance → popularité → date. Tests : classement,
pagination, filtres.

### Décisions prises pendant cette session
- **Score de classement composite, pondérable via `settings`.** Le §8 ne
  donne aucun chiffre — juste « score interne combinant popularité +
  distance + date + fiabilité du créateur » et un exemple montrant qu'un
  Monstre populaire à 3 km peut passer devant un Monstre banal à 100 m (donc
  *pas* un simple tri multi-colonnes strict distance→popularité→date, qui ne
  permettrait jamais ça). Formule retenue :
  `score = wDistance·(1/(1+distanceKm)) + wPopularity·(votesScore/(votesScore+5)) + wRecency·(1/(1+ageJours)) + wTrust·(trustScore/100)`,
  poids par défaut `0.5 / 0.25 / 0.15 / 0.1` (somme 1, distance dominante),
  stockés dans `settings` (`ranking_weight_*`) — modifiables sans
  redéploiement, conforme à la règle d'or. Départage à score égal : distance
  croissante → votes décroissants → date décroissante (repropose la
  « priorité de tri par défaut » du §8 comme tie-break).
  **Popularité et fiabilité sont actuellement neutres** (`votesScore` et
  `trustScore` valent toujours 0/100 pour tout le monde tant que les Phases
  6/10 ne sont pas construites) — le classement se comporte donc pour
  l'instant comme distance → date, ce qui est cohérent et s'activera de
  lui-même plus tard sans retouche.
- **Calculé à la volée, en mémoire, pas en SQL.** Conforme à la décision
  v1.1 du cahier des charges (§8 : « pas de colonne de ranking
  matérialisée »). Comme SQLite n'a pas PostGIS, la distance (Haversine) et
  le score sont calculés en JS après avoir chargé tous les Monstres
  `AVAILABLE` (+ filtre catégorie éventuel), puis triés et paginés en
  mémoire. Volume attendu du V1 largement compatible ; à revisiter (requête
  SQL + PostGIS) si le nombre de Monstres actifs devient important.
- **Distance calculée sur les coordonnées déjà arrondies pour un visiteur
  non connecté**, pas sur les coordonnées réelles, pour rester cohérente
  avec la position que ce visiteur voit par ailleurs (règle §9, déjà
  implémentée en Phase 2 via `OptionalJwtAuthGuard`).
- **Filtres implémentés : catégorie, position+rayon (km).** Le §8 liste
  aussi « date » et « popularité » comme filtres — ce sont ici des facteurs
  du score de classement plutôt que des filtres explicites (ex. « items des
  7 derniers jours », « minimum N votes »). Reporté : pas nécessaire pour
  prouver la valeur de la Phase 3, ajoutable plus tard sans revoir
  l'architecture (mêmes query params, juste plus de conditions `where`).
  Le statut est fixé à `AVAILABLE` (pas un paramètre) : c'est la définition
  même de « recherche active » selon le §6.1, pas une règle métier réglable.
- **`GET /items/:id` existant (Phase 2) réutilisé pour une vraie page de
  détail** (`/monstres/:id`, `ItemDetailView.vue`) — nécessaire pour que la
  liste et la carte mènent quelque part. Pas dans le plan initial de
  Phase 2, mais fait partie de « Consultation » par nature.
- **Carte optionnelle construite quand même** (§8 le permet explicitement
  en V1) : simple, réutilise le pattern Leaflet + correctif d'icônes déjà
  fait en Phase 2. Marqueurs cliquables → page de détail.

### Fait
- [x] `backend/scripts/seed.js` : 4 nouveaux settings `ranking_weight_*`.
- [x] `ItemsService.findMany` : filtre `categoryId`/`radius`, calcul
      distance Haversine, score composite, tri, pagination
      (`page`/`pageSize`, max 50). `GET /items` (`OptionalJwtAuthGuard`).
      DTO `FindItemsQueryDto` (lat/lng/radius/categoryId/page/pageSize,
      coercition `class-transformer`).
- [x] Frontend : `HomeView.vue` reconstruite en vraie liste (géolocalisation
      optionnelle, filtre catégorie, cartes avec miniature/titre/distance/
      votes/ancienneté, pagination précédent/suivant). `ItemDetailView.vue`
      (nouvelle page, route `/monstres/:id`). `MapView.vue` reconstruite
      (carte Leaflet, marqueurs cliquables vers le détail).
      `src/utils/time.ts` (formatage relatif « il y a X min/h/j »).
- [x] Testé de bout en bout : curl (tri par distance vérifié en plaçant un
      point près de la Tour Eiffel — l'item le plus proche remonte bien en
      premier ; pagination `page`/`pageSize` vérifiée ; filtre catégorie
      vérifié, y compris catégorie inexistante → liste vide) ; navigateur
      réel (liste, filtre catégorie, navigation vers le détail, règle vie
      privée §9 reconfirmée sans cookie via `fetch` direct, carte avec les 3
      marqueurs de test). Zéro erreur console.

### Restant / reporté (hors scope de cette session)
- [ ] Filtres explicites « date » et « popularité minimum » (actuellement
      seulement des facteurs de classement, voir décisions ci-dessus).
- [ ] Tests automatisés (Jest) pour le classement/la pagination — validation
      manuelle uniquement cette session.
- [ ] Passage à une requête SQL/PostGIS si le volume de données le justifie
      (actuellement : chargement complet en mémoire puis tri JS).

---

## Phase 4 — Réservation : terminée et validée

Objectif (§17) : réserver, afficher, expiration automatique. Table
`reservations`. Job chaque minute : expirations `RESERVED → AVAILABLE`.
Tests : réservation, expiration, nouvelle disponibilité.

### Décisions prises pendant cette session
- **Un seul endpoint de réservation** (`POST /reservations` avec `itemId` dans
  le body) au lieu de `POST /items/:id/reserve` : plus cohérent avec les
  conventions REST (la ressource racine est `reservations`, pas une action
  imbriquée dans `items`).
- **Annulation volontaire** ajoutée (`POST /reservations/:id/cancel`) :
  le réservateur peut annuler sa réservation. L'Item repasse `AVAILABLE`.
  Le cahier des charges §6.2 ne le prévoyait pas explicitement mais c'est
  un comportement UX attendu (évite d'attendre l'expiration).
- **`activeReservation` ajouté aux réponses `GET /items/:id` et `GET /items`** :
  le frontend a besoin de savoir si l'Item est réservé, par qui, et quand
  ça expire — pas besoin d'un endpoint séparé. Le `findMany` (liste) inclut
  aussi cette donnée pour pouvoir afficher l'état de réservation dans les
  cartes de la homepage.
- **Job d'expiration** : `@nestjs/schedule` avec `@Cron(EVERY_MINUTE)`,
  conforme au §6.2. Parcourt les réservations `ACTIVE` dont `expiresAt ≤ now`,
  les passe en `EXPIRED` et repasse l'Item en `AVAILABLE`. Pas de notification
  d'expiration (à ajouter en Phase 7).
- **Pas de scoring à la réservation** : conforme à la décision de Phase 2
  (scoring = Phase 6).

### Fait
- [x] `backend/src/reservations/` : `ReservationsService` (reserve, cancel,
      findActiveForItem, handleReservationExpirations), `ReservationsController`
      (`POST /reservations`, `POST /reservations/:id/cancel`), DTO
      `CreateReservationDto`, `ReservationsModule`.
- [x] `backend/src/app.module.ts` : ajout de `ReservationsModule`.
- [x] `backend/src/items/items.service.ts` : `includeRelations()` inclut
      la réservation active (`ReservationStatus.ACTIVE`) ; `serialize()` expose
      `activeReservation` dans les réponses.
- [x] Frontend : `src/services/reservations.ts` (`reserveItem`, `cancelReservation`).
      `ItemDetailView.vue` : bouton « Réserver ce Monstre » (utilisateur
      connecté, Item AVAILABLE, pas son propre Monstre), affichage du statut
      « Réservé par X — Expire dans Y min Z s » avec compte à rebours live,
      bouton « Annuler ma réservation » (uniquement pour le réservateur).
      Interface `Item` étendue avec `activeReservation`.
- [x] Testé de bout en bout (script Node.js) : inscription 2 utilisateurs,
      création Monstre par Bob → AVAILABLE, réservation par Alice → RESERVED
      avec `activeReservation` dans le détail, double réservation refusée,
      réservation de son propre Monstre refusée, réservation anonyme → 401,
      annulation par Alice → AVAILABLE.
- [x] Build backend (`npm run build`) et lint (`eslint`) sans erreur.
      Typecheck frontend (`vue-tsc --noEmit`) sans erreur.

### Restant / reporté (hors scope de cette session)
- [ ] Notification d'expiration au réservateur (Phase 7 — Brevo).
- [ ] Tests automatisés (Jest) — validation manuelle uniquement cette session.

---

## Phase 5 — Validation de récupération : terminée et validée

Objectif (§17) : « J'ai récupéré ce Monstre » : photo finale, validation,
changement de statut `RESERVED → COLLECTED`.

### Décisions prises pendant cette session
- **Endpoint `POST /items/:id/collect`** avec upload photo (`FileInterceptor`,
  un seul fichier) — pas un endpoint séparé `POST /reservations/:id/collect`
  car la récupération est une action sur l'Item, pas sur la réservation. Le
  contrôleur `ItemsController` est donc le bon endroit.
- **Seul le réservateur peut collecter.** Vérification côté serveur
  (`activeReservation.userId === user.id`). Bob ne peut pas collecter un
  Monstre réservé par Alice — c'est un choix de sécurité du §6.3.
- **Photo stockée en `COLLECTION`** (enum `ItemPhotoType`) dans `item_photos`,
  conforme au §20. La photo de validation de récupération n'est pas dans une
  table séparée, elle cohabite avec les photos d'annonce mais avec un `type`
  différent.
- **`activeReservation` passe en `null`** après la récupération (reservation
  `COMPLETED`) — la page détail ne l'affiche plus quand le statut est
  `COLLECTED`.
- **Frontend** : input `file` + aperçu + bouton « Confirmer la récupération ».
  Affichage conditionnel : bouton collect visible uniquement si
  `status === RESERVED` ET `isMyReservation`. La photo de collect est affichée
  dans le détail avec un style `COLLECTED` (bordure verte).

### Fait
- [x] `backend/src/items/items.controller.ts` : `POST /items/:id/collect`
      (`FileInterceptor`, `JwtAuthGuard`).
- [x] `backend/src/items/items.service.ts` : `collect()` vérifie statut
      `RESERVED`, vérifie que le demandeur est le réservateur, traite la photo
      (`ImageService.process`), crée l'`ItemPhoto` en `COLLECTION`, passe la
      réservation en `COMPLETED`, passe l'Item en `COLLECTED` + `collectedAt`.
- [x] Frontend : `src/services/items.ts` — `collectItem(itemId, photo)` (multipart).
      `ItemDetailView.vue` : bouton « J'ai récupéré ce Monstre — photo du lieu
      vide » avec input file + aperçu, affichage « Récupéré » avec photo
      collection quand `status === COLLECTED`.
- [x] Testé de bout en bout (script Node.js) : Bob crée → Alice réserve →
      Bob tente de collect → refusé (pas le réservateur) → Alice collecte →
      OK, statut `COLLECTED`, 1 photo collection, `activeReservation` null →
      Alice tente de collecter à nouveau → refusé (plus réservé).
- [x] Build backend + lint sans erreur. Typecheck frontend sans erreur.

### Restant / reporté (hors scope de cette session)
- [ ] Tests automatisés (Jest) — validation manuelle uniquement cette session.

---

## Correctif : build Docker du frontend cassé (post-Phase 5)

L'utilisateur a tenté un premier déploiement Docker réel sur son Proxmox
après la Phase 5 (faite par une autre IA — opencode — en parallèle de cette
conversation). Le build échouait :
```
tsconfig.app.json(7,5): error TS5101: Option 'baseUrl' is deprecated and
will stop functioning in TypeScript 7.0.
```

**Cause** : `frontend/tsconfig.app.json` avait `"baseUrl": "."` (ajouté en
Phase 0 pour l'alias `@`), option dépréciée que `vue-tsc` (v6) traite comme
une erreur bloquante. **Ni moi ni opencode ne l'avions détecté avant** parce
que les deux sessions ont validé le frontend avec `vue-tsc --noEmit`, alors
que le script `npm run build` réel (celui que Docker exécute) lance
`vue-tsc -b` (mode build/projet composite) — **`-b` applique des
vérifications plus strictes que `--noEmit` et ne donne pas les mêmes
erreurs.** Reproduit en local avec `npx vue-tsc -b`.

**Correctif** : suppression de `baseUrl` dans `tsconfig.app.json`. Le
`moduleResolution: "bundler"` (hérité de `@vue/tsconfig`) résout `paths`
sans avoir besoin de `baseUrl` — l'alias `@/*` continue de fonctionner
(vérifié : `npm run build` complet réussit, `dist/` généré correctement).

En corrigeant, deux petits écarts de types ont aussi été trouvés côté
frontend (masqués par le même problème `--noEmit` vs `-b`) : `ItemPhoto`
n'avait pas de champ `type`, `Item` n'avait pas de champ `collectedAt` —
alors que le backend les renvoie bien depuis les Phases 4/5. Corrigés dans
`frontend/src/services/items.ts`.

**Leçon pour toute session future (IA ou humaine) : valider le frontend
avec la vraie commande `npm run build`, jamais seulement
`vue-tsc --noEmit`** — les deux peuvent diverger, et c'est justement
`npm run build` que Docker exécute.

⚠️ **Ce correctif n'a pas pu être testé avec un vrai moteur Docker** (absent
de cette machine de dev, voir décisions Phase 0) — seule la commande
`npm run build` a été reproduite et validée en local, à l'identique de ce
que le `Dockerfile` exécute. À confirmer par l'utilisateur au prochain
`docker compose up --build`.

---

## Correctif : domaine unique en production (post-Phase 5)

Premier déploiement réel sur le Proxmox de l'utilisateur : l'inscription
échouait (`AxiosError: Network Error` sur `api.monstres.fbc.fr` et
`img.monstres.fbc.fr` — échec de connexion pur, pas un 404/500/CORS).
Diagnostic fait en testant directement `https://monstres.fbc.fr/` avec le
navigateur (site réel de l'utilisateur, testé avec son accord).

**Cause** : seul `monstres.fbc.fr` est configuré en DNS + reverse-proxy
externe (celui qui termine le HTTPS, en amont de `nginx/nginx.conf`).
`api.` et `img.` n'existent nulle part en dehors du cahier des charges —
donc `Failed to fetch` inconditionnel depuis le navigateur, quelle que soit
la config Docker interne (vérifiée correcte : `VITE_API_URL` était bien
baked à `https://api.monstres.fbc.fr/api/v1` dans le bundle).

**Décision : domaine unique en V1**, plutôt que de demander à l'utilisateur
d'ajouter deux sous-domaines DNS + entrées de reverse-proxy externe dans
l'immédiat. `nginx/nginx.conf` route maintenant tout sur `monstres.fbc.fr` :
`/api/` → backend, `/uploads/` → storage (préfixe retiré), le reste →
frontend. Variables changées dans `.env.example` (racine) :
`VITE_API_URL`, `IMG_BASE_URL`, `APP_URL`, `JWT_COOKIE_DOMAIN` pointent
toutes vers `monstres.fbc.fr` au lieu des sous-domaines. Annoté dans le
cahier des charges §12.2 comme simplification temporaire, réversible sans
toucher au backend/frontend (juste `nginx.conf` + variables d'env) si
`api.`/`img.` sont ajoutés en DNS plus tard.

⚠️ **`.env` n'est pas versionné** : les déploiements existants doivent
reporter ces nouvelles valeurs à la main dans leur `.env` avant de relancer
`docker compose up -d --build` — un `git pull` seul ne suffit pas puisque
`VITE_API_URL` est figé au build de l'image frontend.

---

## Phase 6 — Système communautaire : terminée et validée

Objectif (§17) : `votes` (type unique `interesting`), `comments`,
`ScoringService` + `scoring_events`.

### Décisions prises pendant cette session
- **Ambiguïté « Récupération » vs « Validation » (§6.8) non résolue,
  assumée.** Le barème liste 2 lignes distinctes (`points_recuperation`=10,
  `points_validation`=5) mais un seul événement nommé
  (`USER_COLLECTED_ITEM`) et une seule action dans mon implémentation de la
  Phase 5 (le `collect()` d'un item = récupération ET validation en un seul
  geste, conforme au §6.3 qui ne décrit qu'une seule étape). **Décision** :
  seul `points_recuperation` (10 pts) est attribué au collecteur lors du
  `collect()`. `points_validation` reste défini dans `settings` mais
  n'est câblé sur aucune action pour l'instant — pas d'action distincte
  identifiable dans le cahier des charges à laquelle le rattacher. À
  clarifier avec le porteur produit si une vraie distinction existe.
- **Vote = bascule (toggle), pas un like permanent.**
  `POST /items/:id/vote` crée le vote s'il n'existe pas, le supprime s'il
  existe déjà (contrainte unique `itemId+userId+type` du schéma Phase 0).
  Auto-vote interdit (`BadRequestException` si `item.userId === user.id`).
- **Points de vote non repris au retrait.** Le propriétaire reçoit
  `points_vote_utile` (1 pt) à la création du vote ; si le votant retire son
  vote, on ne déduit pas les points déjà accordés — un `scoring_event` est
  un fait acquis (historique), pas un compteur live. `item.votesScore`
  (dénormalisé, sert au classement §8), lui, suit bien le vote en temps réel
  (incrémenté/décrémenté à chaque toggle).
  **Limite connue acceptée pour le V1** : un utilisateur peut voter/retirer
  en boucle sur le même item pour faire gagner des points répétés au
  propriétaire (chaque nouveau vote recrée un `scoring_event`). Pas de
  garde-fou anti-abus construit ici — relève de la modération/`trust_score`
  (Phase 10), pas de la Phase 6.
- **`ScoringService` générique et transactionnel** (`src/scoring/`) :
  `award(userId, itemId, type, points)` crée le `scoring_event` ET
  incrémente `User.score` dans la même transaction Prisma. Câblé sur :
  création d'Item (`USER_CREATED_ITEM`, Phase 2, déférée jusqu'ici comme
  documenté) et récupération (`USER_COLLECTED_ITEM`, Phase 5, idem). Les
  deux étaient déjà prévues pour ce branchement sans toucher au reste du code.
- **Commentaires : suppression par l'auteur ou un admin/super admin**
  (`RolesGuard` pas nécessaire ici, simple check de rôle dans le service —
  suffisant pour un seul usage, pas besoin du guard générique). Lecture
  publique (`GET /items/:id/comments`, pas de guard), écriture connectée
  uniquement (§6.6 : « Ne peut pas... commenter » pour le visiteur).
  Pas de scoring lié aux commentaires (absent du barème §6.8).

### Fait
- [x] `src/scoring/` : `ScoringService` (`ScoringModule` global). Câblé dans
      `ItemsService.create()` et `ItemsService.collect()`.
- [x] `src/votes/` : `VotesService.toggle()`, `VotesController`
      (`POST /items/:id/vote`, `JwtAuthGuard`). Anti-auto-vote,
      `item.votesScore` synchronisé, points au propriétaire.
- [x] `src/comments/` : `CommentsService`/`CommentsController`
      (`GET/POST /items/:id/comments`, `DELETE /items/:id/comments/:commentId`).
      DTO `CreateCommentDto` (1-500 caractères).
- [x] `hasVoted` ajouté à la sérialisation `Item` (`GET /items`,
      `GET /items/:id`) : sans ça, le bouton voter se désynchronisait après
      un rechargement de page (le front pensait toujours « non voté »).
      Calculé via une requête `Vote.findUnique` (item seul) ou une requête
      groupée `Vote.findMany` (liste, pour éviter N+1).
- [x] Frontend : `src/services/comments.ts` (nouveau), `toggleVote()` ajouté
      à `src/services/items.ts`. `ItemDetailView.vue` : bouton voter (étoile,
      compteur, état visuel actif/inactif), section commentaires (liste,
      formulaire, suppression conditionnelle auteur/admin).
- [x] Testé de bout en bout : curl (vote → score propriétaire +1 → un-vote
      → auto-vote refusé (400) → commentaire créé → liste publique sans
      cookie → suppression par un admin non-auteur autorisée) **et**
      navigateur réel (connexion, vote qui persiste après rechargement grâce
      à `hasVoted`, commentaire posté puis supprimé par son auteur). Zéro
      erreur console.
- [x] Build + typecheck backend et frontend sans erreur.

### Restant / reporté (hors scope de cette session)
- [ ] Affichage du score/des badges sur le profil (`ProfileView.vue`
      affiche déjà `score` brut depuis la Phase 1, pas de mise en forme
      dédiée « scoring » pour l'instant).
- [ ] Tests automatisés (Jest) — validation manuelle uniquement.
- [ ] Clarification du barème Récupération/Validation avec le porteur
      produit (voir décision ci-dessus).

---

## Numéro de version affiché (0.1.1)

Demande utilisateur : afficher un numéro de version sur l'accueil et le
suivre dans git. `package.json` (`version`) est la source de vérité pour le
frontend **et** le backend — les deux sont montés en parallèle à chaque
bump (pas de versioning indépendant par app pour l'instant, un seul numéro
pour « l'appli » dans son ensemble).

- **Frontend** : `vite.config.ts` lit `version` depuis `package.json` au
  build et l'injecte via `define: { __APP_VERSION__: ... }` (constante
  globale remplacée au build, pas un call runtime). Déclarée dans
  `vite-env.d.ts`. Affichée en bas de `HomeView.vue` (« Les Monstres
  v0.1.1 ») — **il faut l'assigner à une const dans `<script setup>`
  d'abord** (`const appVersion = __APP_VERSION__`) et utiliser cette const
  dans le template : référencer le global directement dans le template fait
  échouer `vue-tsc -b` (le vérificateur de template ne résout pas les
  globals `declare const`, seulement les bindings exposés par le composant).
- **Backend** : `GET /api/v1/health` inclut maintenant `version` (lu depuis
  `package.json` via `fs.readFileSync(join(process.cwd(), 'package.json'))`
  — fonctionne aussi bien en dev (`backend/`) qu'en prod Docker (`/app/`)
  puisque `package.json` est copié à la racine dans les deux cas). Pratique
  pour vérifier ce qui est réellement déployé sans ouvrir le site.
- **Pour bumper la version** : changer `"version"` dans `backend/package.json`
  **et** `frontend/package.json` (les deux, synchronisés à la main pour
  l'instant), rebuild.

---

## Correctif : clés dupliquées dans `.env` (post domaine unique)

Après le correctif « domaine unique », l'inscription échouait encore en
prod malgré un `docker compose up -d --build`. Cause trouvée en lisant le
`.env` collé par l'utilisateur : **il avait ajouté les nouvelles valeurs
(`VITE_API_URL`, `JWT_COOKIE_DOMAIN`) en haut du fichier sans supprimer les
anciennes lignes plus bas.** Dans un `.env`, la **dernière occurrence d'une
clé gagne** — donc l'ancienne valeur (`api.monstres.fbc.fr`, injoignable)
était celle réellement utilisée au build, malgré la bonne valeur présente
ailleurs dans le fichier.

**Leçon pour toute session future** : quand on demande à l'utilisateur de
mettre à jour des valeurs dans un `.env` existant, préciser explicitement
qu'il faut **remplacer** les lignes concernées, pas en ajouter de
nouvelles — ou mieux, lui donner le fichier complet à coller en écrasant
tout, comme fait ici en solution. Un `.env` avec clé dupliquée ne produit
aucune erreur de parsing visible : le bug est silencieux.

Au passage : `backend/scripts/promote-admin.js` ajouté (nouveau script,
même famille que `seed.js`) pour promouvoir un compte `ADMIN`/`SUPER_ADMIN`
en production sans accès direct à Prisma Studio :
`docker compose exec backend node scripts/promote-admin.js <email> [ADMIN|SUPER_ADMIN]`.
Documenté dans `backend/README.md`.

---

## Correctif : Monstres réservés invisibles dans la liste (post-Phase 6)

Signalé par l'utilisateur en testant la prod : `GET /items` filtrait
`status: 'AVAILABLE'` uniquement, donc un Monstre réservé disparaissait
complètement de l'accueil et de la carte pendant sa réservation. **Bug
réel, pas juste une préférence** — le §6.1 du cahier des charges marque
explicitement `RESERVED` comme « Visible » au même titre que `AVAILABLE`
(« Réservé par pseudo — Expire dans X minutes » doit être vu de tous).

**Correctif** : `ItemsService.findMany` filtre maintenant
`status: { in: ['AVAILABLE', 'RESERVED'] } }`. `COLLECTED`,
`PENDING_REVIEW`, `HIDDEN`, `ARCHIVED` restent exclus (non couverts par
« Visible » dans le tableau du §6.1). Badge "Réservé" ajouté dans les
cartes de la liste (`HomeView.vue`) pour que le statut soit visible sans
cliquer sur le Monstre — le détail complet (« Réservé par X — expire dans
Y ») reste sur `ItemDetailView.vue` (déjà fait en Phase 4).

Testé : réservation créée via l'API → apparaît bien dans `GET /items` avec
`status: "RESERVED"` → annulée après test pour ne pas polluer les données
de démo.

---

## Correctif : limites de photos (taille et dimensions)

Demande utilisateur : autoriser 5 Mo par photo en entrée, redimensionner à
la volée pour que le fichier stocké fasse au plus 1200×1200 px (économie
d'espace disque). Trois limites distinctes à corriger, dont une invisible
depuis le code applicatif :

- **`nginx/nginx.conf`** : nginx refuse par défaut tout corps de requête au
  delà de **1 Mo** (`client_max_body_size` non défini) — c'était très
  probablement le vrai blocage ressenti par l'utilisateur, en amont même du
  code applicatif (échec silencieux côté nginx, jamais vu par le backend).
  Ajouté `client_max_body_size 16m;` au niveau du `server{}` (marge pour
  jusqu'à 3 photos × 5 Mo + overhead multipart).
- **`backend/src/items/items.controller.ts`** : `MAX_FILE_SIZE_BYTES` passé
  de 10 Mo à **5 Mo** (limite explicite demandée, plafond technique multer,
  distinct de `max_photos_per_item` qui reste piloté par `settings`).
- **`backend/src/images/image.service.ts`** : `MAX_DIMENSION` passé de
  1920 à **1200** px (déjà en `fit: 'inside', withoutEnlargement: true` —
  ne redimensionne que vers le bas, ne agrandit jamais une image plus petite).

Testé : image de test 3000×2000 uploadée → fichier stocké vérifié à
1200×800 (ratio conservé). Fichier factice de 6 Mo → rejeté en 413
`PayloadTooLargeException` par multer, confirmant la limite de 5 Mo.

⚠️ **Le reverse-proxy externe du Proxmox** (celui qui termine le HTTPS, en
amont de `nginx/nginx.conf`) peut avoir sa **propre** limite de taille de
requête, indépendante de celle-ci. Si l'upload échoue encore après ce
correctif alors qu'il fonctionne en local, vérifier aussi cette limite côté
proxy externe (non gérée dans ce dépôt).

---

## Correctif : badges Réservé/Récupéré dans la liste

Demande utilisateur : badge « Réservé » (déjà fait, correctif précédent) et
badge « Récupéré » sur les Monstres `COLLECTED` dans la liste d'accueil.

**`COLLECTED` ajouté au filtre de visibilité** de `ItemsService.findMany`
(en plus de `AVAILABLE`/`RESERVED`) — sans ça, impossible d'afficher un
badge sur des Monstres qui n'apparaissaient jamais dans la liste. Décision
produit assumée : un Monstre récupéré reste visible (avec son badge) plutôt
que de disparaître instantanément — cohérent avec la philosophie
communautaire du §2 (voir aussi l'historique/traçabilité). Seuls
`PENDING_REVIEW`/`HIDDEN`/`ARCHIVED` restent exclus (modération/historique).

Badge vert « Récupéré » ajouté dans `HomeView.vue`, même emplacement que le
badge ambre « Réservé », couleur reprise du style déjà utilisé pour l'état
`COLLECTED` sur `ItemDetailView.vue` (cohérence visuelle).

Testé : Monstre `COLLECTED` existant (« Chaise en bois », créé pendant les
tests Phase 5) → apparaît bien dans `GET /items` → badge « Récupéré »
confirmé visuellement dans le navigateur. Zéro erreur console.

---

## Phase 7 — Notifications : terminée et validée

Objectif (§17, §6.11) : email uniquement via Brevo, `NotificationService`,
table `notifications`. Types `NEW_ITEM_NEARBY`, `RESERVATION_CREATED`,
`ITEM_COLLECTED`, `BADGE_UNLOCKED`.

### Décisions prises pendant cette session
- **Seuls `RESERVATION_CREATED` et `ITEM_COLLECTED` sont réellement
  déclenchés** cette session. `NEW_ITEM_NEARBY` a besoin des zones
  surveillées (`subscriptions`, Phase 8 — pas encore construite : impossible
  de savoir *qui* est « à proximité » sans elles) et `BADGE_UNLOCKED` a
  besoin d'un système de badges (jamais assigné à une phase précise dans le
  §17, seulement décrit en §6.9 — non construit). Les deux types existent
  déjà dans l'enum et `NotificationsService.notify()` sait déjà les gérer
  (email + historique) : il suffira d'appeler `notify()` au bon endroit
  quand ces briques arriveront, sans retoucher ce module.
- **Consentement email ajouté** (`User.emailNotifications`, défaut `true`,
  migration `20260721220000_add_email_notifications`) — le §9 RGPD exige
  explicitement un consentement « notifications (email oui/non) », absent
  du schéma jusqu'ici. Toggle exposé via `PATCH /users/me/preferences` et
  une case à cocher dans `AlertsView.vue`. **La notification en base est
  toujours créée** (historique conservé, §6.11) même si l'email est
  désactivé — seul l'envoi d'email est conditionné par la préférence.
- **Échec d'envoi d'email non bloquant**, même logique que partout ailleurs
  dans ce projet (vérification email, mot de passe oublié, §11 Facebook) :
  `NotificationsService.notify()` catche l'erreur d'envoi et logge, la
  réservation/récupération ne peut jamais échouer à cause d'un problème
  d'email.
- **Notifications rattachées au propriétaire du Monstre**, pas au visiteur
  qui agit (réserve/collecte) — cohérent avec l'esprit "on informe le
  propriétaire de ce qui se passe sur son Monstre" du §6.11.
- **Pas de badge de compteur non-lu sur l'onglet Alertes** (barre de
  navigation basse) — nécessiterait un état global/polling, jugé disproportionné
  pour cette passe ; la liste elle-même distingue déjà lu/non-lu visuellement.

### Fait
- [x] Schéma : `User.emailNotifications` (migration appliquée).
- [x] `src/notifications/` : `NotificationsService.notify()` (historique +
      email conditionnel), `findMine()`, `markAsRead()`.
      `NotificationsController` : `GET /notifications`, `PATCH /notifications/:id/read`.
- [x] Câblage : `ReservationsService.reserve()` → notifie le propriétaire
      (`RESERVATION_CREATED`) ; `ItemsService.collect()` → notifie le
      propriétaire (`ITEM_COLLECTED`).
- [x] `UsersController` : `PATCH /users/me/preferences` (toggle
      `emailNotifications`). `SafeUser`/`GET /auth/me` renvoient le champ.
- [x] Frontend : `src/services/notifications.ts`, `AlertsView.vue`
      reconstruite (liste lu/non-lu, marquage au clic, case à cocher
      préférence email), store `auth.setEmailNotifications()`.
- [x] Testé de bout en bout : réservation → notification créée avec les
      bonnes données chez le propriétaire → email tenté via Brevo (clé
      réelle configurée, pas d'erreur loggée) → marquage lu (API + clic
      navigateur, requête réseau confirmée) → toggle préférence email
      (API + `/auth/me` reflète le changement). Zéro erreur console.
- [x] Build + typecheck backend et frontend sans erreur.

### Restant / reporté (hors scope de cette session)
- [ ] `NEW_ITEM_NEARBY` : à câbler en Phase 8 (dépend de `subscriptions`).
- [ ] `BADGE_UNLOCKED` : à câbler quand un système de badges existera (non
      assigné à une phase précise dans le cahier des charges).
- [ ] Tests automatisés (Jest) — validation manuelle uniquement.

---

## Fonctionnalité : page « Nous » (annuaire de la communauté)

Demande utilisateur, hors plan de phases du §17 : lister les membres de la
communauté (date d'inscription, Monstres déclarés/réservés/récupérés, votes
reçus sur leurs Monstres en badge). Rattaché à l'esprit du profil public
(§10) et des statistiques « meilleurs contributeurs » prévues côté admin
(§14), mais pas une phase nommée — traité comme un ajout ponctuel plutôt
que comme une nouvelle phase.

### Décisions prises pendant cette session
- **Pas de 6ᵉ onglet dans la barre de navigation basse.** Le §4 du cahier
  des charges fixe explicitement la barre à 5 éléments (Accueil, Carte,
  Ajouter, Alertes, Profil) — non négociable. La page « Nous »
  (`/communaute`) est accessible via un lien depuis `ProfileView.vue`,
  visible que l'on soit connecté ou non (info publique).
- **Interprétation des 4 stats demandées** :
  - « déclarés » = nombre d'`Item` créés par le membre.
  - « réservés » = nombre de `Reservation` faites par le membre, tous
    statuts confondus (reflète son activité de « chasseur », pas seulement
    les réservations abouties).
  - « récupérés » = nombre de `Reservation` avec `status: COMPLETED` faites
    par le membre (récupération effectivement validée avec photo — Phase 5).
  - « votes reçus » = nombre de `Vote` sur les Items **appartenant** au
    membre (popularité de ses propres Monstres, pas les votes qu'il a
    donnés aux autres).
- **Endpoint public** (`GET /users`, sans guard) : cohérent avec l'esprit
  communautaire/transparent de la plateforme et avec le fait que ce sont
  des agrégats de données déjà publiques (profil public §10). Trié par
  score décroissant (mini-classement, cohérent avec les stats « meilleurs
  contributeurs » prévues en Phase 9).
- **Comptages via requêtes séparées** (`itemsReserved`, `votesReceived`)
  plutôt qu'un unique `_count` Prisma : `votesReceived` traverse une
  relation à deux sauts (`User` → `Item` → `Vote`), non exprimable en un
  `_count` simple sur `User`. Acceptable en volume V1 (nombre d'utilisateurs
  faible) ; à revoir avec des agrégations SQL si la base grandit beaucoup.

### Fait
- [x] `UsersService.findCommunity()` + `GET /users` (public).
- [x] `CommunityView.vue` (route `/communaute`) : liste des membres, avatar
      ou initiale, date d'inscription formatée, score, 4 badges de stats.
      Lien ajouté dans `ProfileView.vue`.
- [x] Testé de bout en bout : données réelles de test (créations,
      réservations, récupérations, votes accumulés pendant les sessions
      précédentes) correctement agrégées et affichées. Zéro erreur console.
- [x] Build + typecheck backend et frontend sans erreur.

---

## Phase 8 — Abonnements géographiques : terminée et validée

Objectif (§17, §6.10) : table `subscriptions` (nom, position, rayon).
Limites : `max_subscriptions = 5`, `max_radius = 5000 m`.

### Décisions prises pendant cette session
- **`haversineKm` extrait dans `src/common/geo.util.ts`** (était dupliqué/
  privé dans `items.service.ts`) pour être réutilisé par
  `SubscriptionsService` sans dupliquer le calcul de distance.
- **Bug trouvé et corrigé pendant les tests** : un utilisateur avec
  plusieurs zones qui matchent toutes le même nouveau Monstre recevait
  **une notification par zone** (5 notifications identiques observées en
  test). Corrigé : dédoublonnage par `userId` (`Set`) avant d'appeler
  `notify()`, un seul envoi par utilisateur quel que soit le nombre de
  zones qui matchent.
- **Le créateur n'est jamais notifié de son propre Monstre**, même s'il a
  une zone surveillée qui le couvre géographiquement (garde explicite dans
  `notifyNearbySubscribers`).
- **Pas de toggle actif/inactif** sur les zones (le champ `active` du
  schéma Phase 0 reste toujours `true`) — seule la suppression permet
  d'arrêter la surveillance. Simplicité V1 assumée ; le champ reste prêt
  si un besoin de pause temporaire apparaît plus tard.
- **`SubscriptionsModule` non global**, contrairement à
  Settings/Email/Scoring/Notifications : importé explicitement dans
  `ItemsModule` (seul consommateur), cohérent avec les autres modules
  « métier » (Reservations, Votes, Comments) qui ne sont pas globaux.

### Fait
- [x] `src/subscriptions/` : `SubscriptionsService` (create avec limites
      `max_user_subscriptions`/`max_subscription_radius` via
      `SettingsService`, `findMine`, `remove`, `notifyNearbySubscribers`).
      `SubscriptionsController` : `GET/POST /subscriptions`,
      `DELETE /subscriptions/:id`.
- [x] Câblé dans `ItemsService.create()` : chaque nouveau Monstre déclenche
      `notifyNearbySubscribers()`.
- [x] Frontend : `src/services/subscriptions.ts`, section « Zones
      surveillées » ajoutée dans `AlertsView.vue` (liste avec rayon en km,
      suppression, formulaire d'ajout avec géolocalisation, curseur de
      rayon 0,5–5 km, compteur X/5).
- [x] Testé de bout en bout : création (limite rayon 5000m rejetée à
      6000m, limite 5 zones rejetée à la 6e), notification `NEW_ITEM_NEARBY`
      déclenchée à la création d'un Monstre dans le rayon (bug de doublon
      trouvé et corrigé pendant ce test), affichage/suppression dans le
      navigateur. Géolocalisation non testable dans l'environnement de test
      (permission refusée par le navigateur headless) — zone créée via API
      pour valider l'affichage/suppression UI à la place.
- [x] Build + typecheck backend et frontend sans erreur.

### Restant / reporté (hors scope de cette session)
- [ ] Tests automatisés (Jest) — validation manuelle uniquement.

---

## Correctif : couleurs de statut sur la carte + masquage des Monstres récupérés >24h

Demande utilisateur : les marqueurs Leaflet doivent refléter le statut du
Monstre (réservé/récupéré), et les Monstres récupérés ne doivent plus
apparaître (liste + carte) 24h après leur récupération — sauf pour les
admins, qui gardent une vue complète à des fins de suivi/modération.

### Décisions
- **Couleurs des marqueurs alignées sur les badges de `HomeView.vue`** :
  ambre `#f59e0b` (RESERVED), vert `#22c55e` (COLLECTED), violet `#7c3aed`
  (AVAILABLE, couleur primaire de l'appli). Implémenté via `L.divIcon`
  (`statusIcon()` dans `MapView.vue`) plutôt que des icônes PNG colorées.
- **Masquage 24h calculé dans `ItemsService.findMany`, pas au niveau DB** :
  `viewer.role` (`ADMIN`/`SUPER_ADMIN`) donne accès à tous les statuts
  visibles (`AVAILABLE`/`RESERVED`/`COLLECTED` sans filtre de date) ; les
  autres viewers (utilisateur normal ou anonyme) reçoivent en plus un
  filtre `collectedAt >= now - 24h` sur les Monstres `COLLECTED`. Un seul
  point de filtrage, réutilisé par la liste (`HomeView`) et la carte
  (`MapView`), qui appellent tous deux `GET /items`.
- **`findById` (page de détail) n'est pas concerné** : un Monstre récupéré
  reste consultable via lien direct au-delà de 24h, seule sa présence dans
  les listes/carte est masquée. Décision de simplicité V1, pas de demande
  contraire du cahier des charges.

### Fait
- [x] Backend : `ItemsService.findMany` — filtre conditionnel sur le rôle
      du viewer, cutoff `Date.now() - 24h`.
- [x] Frontend : `MapView.vue` — `statusIcon()` par statut, marqueurs
      recolorés en fonction de `item.status`.
- [x] Testé de bout en bout : bascule manuelle du statut/`collectedAt` d'un
      Monstre de test en base (`dev.db`) pour vérifier (1) qu'un Monstre
      `COLLECTED` avec `collectedAt` > 24h est absent de `GET /items` pour
      un viewer anonyme mais présent pour un viewer `ADMIN` (JWT signé
      manuellement avec `JWT_SECRET` pour le test, aucune modification de
      compte réelle), et (2) que les couleurs de marqueurs sur `/carte`
      correspondent bien au statut de chaque Monstre (vérifié via
      inspection du DOM, `style.background` de chaque marqueur). État de
      test restauré dans `dev.db` après vérification.
- [x] Build + typecheck backend et frontend sans erreur.

---

## Phases suivantes (non commencées)

Voir §17 du cahier des charges pour le détail complet de chaque phase. Ordre
et contenu résumé :

- [ ] **Phase 9 — Administration.** Dashboard, gestion utilisateurs/Monstres/
      catégories/paramètres.
- [ ] **Phase 10 — Modération.** Table `reports`, seuils `settings`,
      workflow `PENDING_REVIEW` → décision modérateur.
- [ ] **Phase 11 — Facebook.** Après validation du cœur applicatif
      uniquement. Ne jamais bloquer la création d'un Monstre si Facebook
      échoue.

Rappel méthode (§0) : chaque phase doit produire une **version fonctionnelle
et testée** avant de passer à la suivante — ne pas paralléliser plusieurs
phases à la fois.

---

## Comment reprendre

1. Lire `CLAUDE.md` puis ce fichier en entier.
2. `git log --oneline` et `git status` pour voir l'état réel du dépôt (ce
   fichier peut avoir dérivé si des sessions n'ont pas mis à jour les cases).
3. Vérifier que tout démarre toujours :
   - `backend/` : `npm install`, `npm run prisma:migrate`,
     `npm run prisma:seed`, puis `npm run start:dev`, tester
     `GET http://localhost:3000/api/v1/health`.
   - `frontend/` : `npm install` puis `npm run dev`, ouvrir
     `http://localhost:5173`. Tester une inscription sur `/inscription`
     pour confirmer que l'auth fonctionne toujours de bout en bout.
4. Les Phases 0 à 8 sont terminées. Continuer sur la première case non
   cochée de **Phase 9 — Administration** (section « Phases suivantes »
   ci-dessus), puis enchaîner dans l'ordre. Ne pas paralléliser plusieurs
   phases à la fois (§0). Pour toute nouvelle migration Prisma en session
   non interactive, voir le workaround documenté dans `backend/README.md`
   (section Base de données).
5. Pour tester en local sans repasser par l'inscription : se connecter avec
   `marc@fbc.fr` ou `admin@monstres.local` (mot de passe demandé à
   l'utilisateur si besoin), ou promouvoir un nouveau compte via
   `npm run prisma:studio` (dev) ou
   `docker compose exec backend node scripts/promote-admin.js <email>` (prod).
6. **Le projet est en production** (`https://monstres.fbc.fr`, Proxmox de
   l'utilisateur). Toute modification affectant le déploiement (nginx,
   `.env.example`, Dockerfiles) doit rester cohérente avec la config réelle
   documentée dans les sections « Correctif » ci-dessus — domaine unique,
   pas de sous-domaines api./img. pour l'instant. `.env` n'est pas
   versionné : rappeler à l'utilisateur de reporter les nouvelles valeurs à
   la main (en remplaçant, pas en dupliquant les clés — voir le bug de
   clés dupliquées ci-dessus) avant chaque `docker compose up -d --build`.
