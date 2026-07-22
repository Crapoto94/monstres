# Suivi de développement — Les Monstres

> Fichier de reprise de contexte. À lire par toute IA/dev qui reprend le
> projet. Mettre à jour ce fichier à chaque session (cocher les cases,
> ajouter des décisions, déplacer les tâches terminées).
>
> Référence fonctionnelle complète : [`LES_MONSTRES_cahier_des_charges.md`](./LES_MONSTRES_cahier_des_charges.md)
> Règles non négociables : [`CLAUDE.md`](./CLAUDE.md)

Dernière mise à jour : **2026-07-22** (v0.3.8 — page blanche après
connexion Facebook/Google : le service worker interceptait la redirection
OAuth du backend)

**Statut : Phases 0 à 11 terminées et validées.** Le plan du cahier des
charges (§17) est désormais entièrement construit ; il ne reste que les
tâches "reportées" documentées au fil des sections ci-dessous (sanctions à
paliers, ajustement automatique de trustScore, badges, tests automatisés).
Prochaine étape : à définir avec l'utilisateur. Le projet est
déployé en production sur `https://monstres.fbc.fr` (domaine unique, voir la
section dédiée plus bas pour l'historique des correctifs de déploiement).

⚠️ **`backend/.env` local contient une vraie clé `BREVO_API_KEY`** (pas
juste un exemple) : toute action qui déclenche une notification email
(réservation, récupération, `NEW_ITEM_NEARBY`…) envoie un **vrai email**
via Brevo, y compris à des adresses de test bidon. Si tu dois tester ces
flux en masse, retire temporairement `BREVO_API_KEY` de `.env` (les emails
seront alors juste loggés, voir `backend/README.md`) puis remets-la.

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

## Fonctionnalité : zones surveillées affichées sur la carte

Demande utilisateur : afficher ses zones surveillées (abonnements
géographiques, §6.10) directement sur la carte (`/carte`), en plus de la
liste dans `AlertsView`.

### Décisions
- **Rendu en `L.circle`** (cercle métrique centré sur `lat/lng`, rayon en
  mètres tel que stocké), pas de marqueur ponctuel — représente fidèlement
  la zone de couverture plutôt qu'un point.
- **Couleur violette (`#7c3aed`)**, cohérente avec le violet déjà utilisé
  pour les Monstres `AVAILABLE`, mais distincte visuellement (remplissage
  semi-transparent `fillOpacity: 0.1`) pour ne pas se confondre avec les
  marqueurs de Monstres.
- **Chargé uniquement si `auth.isAuthenticated`** — les zones sont privées
  à l'utilisateur (`GET /subscriptions` retourne déjà uniquement les
  siennes côté backend, aucun changement API nécessaire).
- **Popup au clic** affichant le nom de la zone et son rayon en km, cohérent
  avec l'affichage dans `AlertsView`.

### Fait
- [x] Frontend : `MapView.vue` — import de `fetchSubscriptions` et
      `useAuthStore`, ajout des cercles après le chargement des Monstres.
- [x] Testé de bout en bout : utilisateur de test créé via API, zone de
      surveillance créée (1,5 km), connexion réelle via le formulaire de
      `/connexion` dans le navigateur, navigation vers `/carte`, cercle
      violet vérifié dans le DOM (`fill`/`stroke` du path SVG Leaflet) et
      popup vérifié au clic (« Chez moi (test) (1.5 km) »). Utilisateur et
      zone de test supprimés de `dev.db` après vérification.
- [x] Build + typecheck backend et frontend sans erreur.

---

## Fonctionnalité : photo + lien vers le Monstre dans les notifications de proximité

Demande utilisateur : dans les alertes « Monstre près de chez moi », afficher
la photo du Monstre et un lien vers sa page de détail (jusqu'ici seul le
titre en texte était affiché, sans moyen d'accéder directement au Monstre).

### Décisions
- **`NotificationData['NEW_ITEM_NEARBY']` étendu avec `itemPhotoUrl`**
  (`string | null`), construit une seule fois côté `ItemsService.create()`
  (URL absolue via `IMG_BASE_URL`, même logique que `serialize()`) puis
  transmis à `SubscriptionsService.notifyNearbySubscribers()` — pas de
  requête supplémentaire côté `SubscriptionsService`, qui n'a pas accès à
  `ConfigService`.
- **`ItemsService.photoUrl()` (privé)** : utilise la miniature
  (`thumbnailPath`) si disponible, sinon la photo pleine taille — cohérent
  avec l'usage habituel des miniatures dans les listes.
- **Seul le type `NEW_ITEM_NEARBY` devient cliquable/illustré** dans
  `AlertsView.vue` (`RouterLink` vers `/monstres/:itemId` + `<img>`) ; les
  autres types (`RESERVATION_CREATED`, `ITEM_COLLECTED`, `BADGE_UNLOCKED`)
  restent de simples `<div>` non cliquables, scope limité à la demande.
  Pourrait être généralisé plus tard si demandé (les deux premiers ont
  aussi un `itemId` en données).
- **Email de notification inchangé** — la demande portait explicitement sur
  la page Alertes, pas sur l'email.

### Fait
- [x] Backend : `NotificationData['NEW_ITEM_NEARBY']` + `NotifiableItem`
      (`subscriptions.service.ts`) étendus avec `itemPhotoUrl`/`photoUrl` ;
      `ItemsService.create()` calcule l'URL de la miniature avant d'appeler
      `notifyNearbySubscribers()`.
- [x] Frontend : `AlertsView.vue` — notifications `NEW_ITEM_NEARBY` rendues
      en `RouterLink` (photo + titre + lien vers la page du Monstre),
      passage au clic toujours suivi du marquage "lu".
- [x] Testé de bout en bout : deux utilisateurs de test créés via API
      (abonné + créateur), zone de surveillance créée, Monstre créé avec
      une vraie photo (réutilisée depuis `backend/storage/`) à proximité
      → notification vérifiée en base (`itemPhotoUrl` correctement rempli),
      connexion réelle du navigateur en tant qu'abonné, clic sur la
      notification dans `/alertes` vérifié : navigation vers
      `/monstres/:id` et `PATCH /notifications/:id/read` déclenché.
      Utilisateurs/Monstre/photo de test supprimés après vérification.
- [x] Build + typecheck backend et frontend sans erreur.

---

## Phase 9 — Administration : terminée et validée

Objectif (§14, §17) : dashboard + gestion utilisateurs/Monstres/catégories/
paramètres. Le module `admin/` existait déjà en germe depuis la Phase 1
(`AdminUsersController.verifyEmail`, préfixe `/admin/*` réservé
ADMIN/SUPER_ADMIN) — cette phase l'étend en admin complet.

### Décisions prises pendant cette session
- **Scope volontairement réduit par rapport à §14** : la file de
  **signalements** (« Signalements ») et la création de **badges** ne sont
  **pas** construites ici, malgré leur mention dans §14/§17-Phase 9. Raison :
  aucun flux utilisateur ne permet encore de créer un `Report` (bouton
  « signaler » absent, compteur/seuil non câblés) — c'est exactement l'objet
  de la **Phase 10 (Modération)**, qui vient juste après. Construire une
  file d'admin pour une table structurellement vide aurait été du travail
  jeté. Idem pour les badges : la table `badges`/`user_badges` existe
  depuis la Phase 0 mais rien ne déclenche encore de déblocage
  (`NotificationType.BADGE_UNLOCKED` n'est émis nulle part) — à construire
  quand la logique de déblocage existera.
- **Modération de compte (suspendre/bannir) : nouveaux champs `User.suspendedAt`
  / `User.bannedAt`** (migration `20260722010000_add_user_moderation`,
  `ALTER TABLE` simple, pas de `RedefineTables`). `AuthService.validateUser`
  rejette la connexion (`ForbiddenException`) si l'un des deux est renseigné,
  **après** la vérification du mot de passe (pas d'énumération de comptes
  bannis via ce chemin). Le cookie JWT existant d'une session déjà ouverte
  n'est pas invalidé rétroactivement (pas de liste de révocation en V1) —
  limite connue, acceptable vu la durée de vie du cookie (7 jours) et le cas
  d'usage (modération, pas sécurité critique).
- **Garde-fous de rang dans `AdminUsersService`** (`assertCanModerate`) :
  un admin ne peut pas s'auto-modérer (suspendre/bannir/supprimer/changer
  son propre rôle), et seul un `SUPER_ADMIN` peut modérer un compte
  `ADMIN`/`SUPER_ADMIN` ou accorder/retirer ces rôles — cohérent avec §5
  du cahier des charges (Modérateur/Administrateur/Super Administrateur).
  La **suppression définitive d'un compte est réservée SUPER_ADMIN**
  (irréversible, cascade DB via les `onDelete: Cascade` du schéma +
  nettoyage des photos disque de ses Monstres).
- **Suppression d'un Monstre par un admin** : nettoyage disque via
  `ImageService.deleteItemPhotos(itemId)` (nouvelle méthode, `rm -rf` du
  dossier `storage/items/<id>`), pour éviter d'accumuler des photos
  orphelines — cohérent avec le suivi « espace disque » du dashboard (§14).
- **Catégories** : la suppression est refusée si des Monstres y sont encore
  rattachés (`BadRequestException` avec le compte exact), jamais de
  suppression en cascade des Monstres — cohérent avec §14 ("suppression si
  aucun Item lié").
- **Paramètres (`settings`)** : `PATCH /admin/settings/:key` accepte
  uniquement `value` (le `type` existant est préservé si non fourni
  explicitement, pour ne pas corrompre le typage `INTEGER`/`FLOAT` d'un
  réglage existant en le réécrivant sans préciser son type).
- **Recherche utilisateurs/Monstres** : `contains` simple (pas de
  `mode: 'insensitive'`, non supporté par le provider SQLite de Prisma) —
  suffisant en V1, la casse ASCII est déjà insensible via SQLite `LIKE`.
- **Frontend** : routes imbriquées `/admin/*` avec `meta: { requiresAdmin: true }`,
  gardées dans `router.beforeEach` (redirection silencieuse vers `/` si
  non-admin, pas de message d'erreur — cohérent avec le traitement existant
  de `requiresAuth`). Nouveau getter `auth.isAdmin` dans le store. Lien
  « Administration » ajouté dans `ProfileView.vue`, visible seulement si
  `auth.isAdmin` (même pattern que le lien « Nous »). L'admin n'est **pas**
  dans la bottom nav (5 items fixes, inchangés) — accessible uniquement
  depuis le Profil, comme la Communauté.
- **Double garde intentionnelle** : le guard frontend (`router.beforeEach`)
  évite un flash de contenu admin pour un non-admin, mais la vraie
  protection est côté backend (`RolesGuard` sur chaque contrôleur
  `admin/*`) — vérifié explicitement en testant l'accès direct à l'API
  avec le cookie d'un utilisateur normal (rejeté).

### Fait
- [x] Backend : migration `suspendedAt`/`bannedAt` sur `User` +
      `AuthService.validateUser` mis à jour.
- [x] Backend : `CategoriesService` étendu (`findAllForAdmin`, `create`,
      `update`, `remove` avec garde de suppression) + DTOs.
- [x] Backend : `SettingsService.findAll()`/`findByKey()` +
      `AdminSettingsController` (`GET`/`PATCH /admin/settings/:key`).
- [x] Backend : `ImageService.deleteItemPhotos()` + `AdminItemsService`
      (recherche multi-critères paginée, détail, changement de statut,
      suppression définitive) + `AdminItemsController`.
- [x] Backend : `AdminUsersService` étendu (liste paginée avec recherche,
      détail avec stats, changement de rôle avec garde-fous de rang,
      suspendre/lever, bannir/débannir, suppression définitive réservée
      SUPER_ADMIN) + endpoints `AdminUsersController` correspondants.
- [x] Backend : `AdminDashboardService`/`Controller` (compteurs
      utilisateurs/Monstres par statut, taux de récupération, nouveaux
      7j/30j, signalements en attente).
- [x] Frontend : `services/admin.ts` (wrappers typés pour tous les
      endpoints ci-dessus), `auth.isAdmin` (store).
- [x] Frontend : routes `/admin`, `/admin/utilisateurs`, `/admin/monstres`,
      `/admin/categories`, `/admin/parametres` (gardées), lien Profil.
- [x] Frontend : `AdminLayout.vue` (onglets) + `AdminDashboardView`,
      `AdminUsersView` (recherche, rôle, suspendre/bannir/supprimer,
      valider email), `AdminItemsView` (recherche/filtres, changer statut,
      supprimer), `AdminCategoriesView` (CRUD), `AdminSettingsView`
      (édition inline par clé).
- [x] Testé de bout en bout avec un compte SUPER_ADMIN de test (créé via
      inscription + `scripts/promote-admin.js`, supprimé après coup) :
      dashboard (vraies stats), recherche + suspendre/lever + bannir +
      auto-modération refusée (`BadRequestException`) + connexion bloquée
      pour un compte suspendu puis banni (vérifié via `/auth/login` direct)
      + suppression définitive (réservée SUPER_ADMIN, vérifiée), Monstres
      (recherche/filtres, changement de statut persistant vérifié en base,
      suppression), catégories (création, activation/désactivation,
      suppression bloquée si Monstres liés puis acceptée si vide),
      paramètres (édition d'une valeur `INTEGER`, `type` préservé après
      coup), garde de rôle (utilisateur normal redirigé hors de `/admin`
      côté frontend **et** rejeté par le backend en accès direct).
- [x] Build + typecheck backend et frontend sans erreur.

### Restant / reporté (hors scope de cette session)
- [ ] File de modération / signalements (Phase 10 — nécessite d'abord le
      flux de création de `Report` côté utilisateur).
- [ ] Création de badges configurables (nécessite d'abord une logique de
      déblocage réelle — aucune pour l'instant).
- [ ] Statistiques avancées (carte de chaleur géographique, villes actives) —
      hors scope, non demandées explicitement.
- [ ] Tests automatisés (Jest) — validation manuelle uniquement.

---

## Correctif : photo + lien dans l'email de notification `NEW_ITEM_NEARBY`

Demande utilisateur : le mail envoyé pour une alerte de zone surveillée
devait, comme la page Alertes, inclure la photo du Monstre et un lien
cliquable vers sa page.

### Fait
- [x] `NotificationsService` : injection de `ConfigService`, email
      `NEW_ITEM_NEARBY` reconstruit avec une miniature (`<img>` liée) et un
      lien `FRONTEND_URL/monstres/:id` (même convention que les autres
      emails du service : vérification email, réinitialisation mot de
      passe).
- [x] Vérifié via déclenchement réel (création d'un Monstre à proximité
      d'une zone surveillée) — **attention** : `BREVO_API_KEY` est
      renseignée en local avec une vraie clé, donc ce test a réellement
      envoyé un email via Brevo à une adresse de test bidon (voir
      l'avertissement en tête de ce fichier). Contenu confirmé correct par
      relecture du code (même convention que les emails existants), pas de
      seconde vérification en direct pour éviter un nouvel envoi réel.

---

## Phase 10 — Modération : terminée et validée

Objectif (§6.5, §14, §17) : workflow signalement → compteur → seuil atteint
→ `PENDING_REVIEW` → décision modérateur. La table `reports` existait
depuis la Phase 0 mais n'était alimentée par aucun flux utilisateur — cette
phase construit à la fois le côté « signaler » (utilisateur) et le côté
« modérer » (Modérateur/Admin).

### Décisions prises pendant cette session
- **Un signalement par utilisateur et par Monstre, tous types confondus**
  (`@@unique([itemId, userId])` sur `Report`, migration
  `20260722020000_add_report_unique_constraint`). Interprétation retenue de
  « 3 signalements distincts » (§6.5) : distincts par **utilisateur**, pas
  par type — un même utilisateur ne fait donc pas monter le compteur deux
  fois. Une tentative de second signalement renvoie une erreur claire
  (« Tu as déjà signalé ce Monstre. ») plutôt qu'un échec silencieux.
- **Deux compteurs indépendants, comme spécifié** : signalements « qualité »
  (`FAKE`/`WRONG_LOCATION`/`INAPPROPRIATE`/`DUPLICATE`) déclenchent
  `AVAILABLE → PENDING_REVIEW` au seuil `report_threshold` (défaut 3) ;
  `ALREADY_COLLECTED` déclenche `→ ARCHIVED` (pas `COLLECTED`, réservé à une
  vraie récupération validée) au seuil `already_collected_threshold`
  (défaut 3). Les deux transitions ne s'appliquent que si l'Item est encore
  `AVAILABLE` ou `RESERVED` — un Item déjà en révision/masqué/archivé/récupéré
  n'est pas retouché par un nouveau signalement.
- **Auto-signalement bloqué**, même logique que l'auto-vote (§6.4).
- **Rôle MODERATOR enfin mis en usage** (existait dans l'enum depuis la
  Phase 0, jamais exploité) : `AdminReportsController` (`/admin/reports`)
  est le premier contrôleur accessible à MODERATOR **et** ADMIN/SUPER_ADMIN,
  conformément à §5 (« Modérateur : traite les signalements, masque du
  contenu, sanctionne »). Décision **KEEP** (conserver) remet l'Item
  `AVAILABLE` et repasse les signalements `PENDING` en `REJECTED` ;
  **HIDE** (masquer) passe l'Item `HIDDEN` et les signalements en
  `ACCEPTED` ; **DELETE** supprime l'Item définitivement (cascade DB +
  nettoyage des photos disque via `ImageService.deleteItemPhotos`, déjà
  construit en Phase 9).
- **`AdminUsersController` : accès MODERATOR élargi méthode par méthode**
  (`@Roles()` au niveau handler, qui prend le pas sur le `@Roles()` de
  classe dans `RolesGuard`) — lecture (`findAll`/`findOne`) et suspension
  temporaire (`suspend`/`unsuspend`) ouvertes à MODERATOR pour lui permettre
  d'agir depuis la file de modération ; bannissement définitif, changement
  de rôle et suppression de compte restent réservés ADMIN/SUPER_ADMIN — le
  Modérateur "sanctionne" (§5) mais ne bannit pas définitivement ni ne
  gère les comptes admin.
- **Sanction = raccourci vers `suspend` existant**, pas de système de
  sanctions à paliers (avertissement → limitation → bannissement 24h →
  définitif) décrit en §6.5 — **explicitement hors scope de cette session**
  : construire l'escalade demanderait de suivre un historique de sanctions
  par utilisateur (nouvelle table ou compteur), non demandé explicitement.
  Documenté ici pour qu'une session future sache que c'est une
  simplification volontaire, pas un oubli.
- **Pas d'ajustement automatique de `trustScore`** suite à une décision de
  modération (§6.8 : "diminue avec faux signalements, abus, suppressions").
  Complexe à attribuer correctement (faute du créateur ? des signaleurs
  abusifs ?) et non demandé explicitement — **explicitement hors scope**,
  comme les badges et les statistiques avancées notés en Phase 9.
- **Frontend : garde de route à deux niveaux.** Le layout parent `/admin`
  n'exige plus que `requiresModerator` (MODERATOR/ADMIN/SUPER_ADMIN) ; les
  sous-routes réservées à l'administration complète (dashboard,
  utilisateurs, Monstres, catégories, paramètres) ajoutent `requiresAdmin`
  en plus. Vue Router fusionne le `meta` de toute la hiérarchie de routes
  matchées, donc `to.meta` porte les deux indicateurs simultanément sans
  duplication. Un Modérateur qui atterrit sur une page admin-only est
  redirigé vers `/admin/signalements` (pas vers `/`, pour rester dans un
  espace qu'il peut utiliser) ; un non-modérateur est redirigé vers `/`.
  `AdminLayout.vue` masque les onglets admin-only si `!auth.isAdmin`,
  ne laissant que l'onglet « Signalements » à un pur Modérateur.
- **Lien Profil adaptatif** : libellé et cible changent selon le rôle
  (« Administration » → `/admin` pour un admin, « Modération » →
  `/admin/signalements` pour un modérateur seul), visible dès que
  `auth.isModerator`.
- **`item.hasReported`** ajouté à la sérialisation de `GET /items/:id`
  (même pattern que `hasVoted`), pour que le bouton « Signaler » disparaisse
  après rechargement de page sans dépendre uniquement de la gestion
  d'erreur 409 côté frontend.

### Fait
- [x] Backend : migration `reports_itemId_userId_key` (contrainte unique).
- [x] Backend : `src/reports/` — `ReportsService.create()` (garde
      auto-signalement, unicité, calcul des deux seuils via `settings`),
      `ReportsController` (`POST /items/:id/report`), module enregistré.
- [x] Backend : `ItemsService` — `hasReported` calculé dans `findById` et
      transmis à `serialize()`.
- [x] Backend : `src/admin/` — `AdminReportsService`/`Controller`
      (`GET /admin/reports` file paginée avec signalements PENDING inclus,
      `POST /admin/reports/:itemId/resolve` avec KEEP/HIDE/DELETE),
      `AdminUsersController` étendu avec des `@Roles()` par méthode pour
      MODERATOR sur lecture/suspension.
- [x] Frontend : `ItemDetailView.vue` — bouton « Signaler ce Monstre »
      (masqué pour le propriétaire et après signalement), formulaire
      inline (type + raison optionnelle), gestion de l'erreur 409.
- [x] Frontend : `services/items.ts` (`reportItem`, `hasReported`),
      `services/admin.ts` (file + résolution), `stores/auth.ts`
      (`isModerator`), `router/index.ts` (garde à deux niveaux),
      `AdminLayout.vue` (onglets conditionnels), `AdminReportsView.vue`
      (file, décisions, sanction), `ProfileView.vue` (lien adaptatif).
- [x] Testé de bout en bout avec 4 comptes signaleurs + 1 propriétaire +
      1 compte MODERATOR (promu directement en base, `promote-admin.js`
      refusant volontairement les rôles autres qu'ADMIN/SUPER_ADMIN) :
      auto-signalement refusé, double signalement refusé (409), seuil
      qualité → `PENDING_REVIEW` vérifié avec 2 signalements insuffisants
      puis le 3e déclenchant la transition, seuil `already_collected` →
      `ARCHIVED` vérifié pareillement, décisions KEEP/HIDE/DELETE vérifiées
      (DELETE confirmé avec nettoyage des photos sur disque), Modérateur
      confirmé bloqué sur dashboard/catégories/settings/ban/delete/role
      mais autorisé sur signalements + lecture/suspension utilisateurs,
      navigateur réel : bouton Signaler → formulaire → confirmation →
      persistance après rechargement, file de modération affichée et
      résolue depuis l'UI (Masquer testé, statut vérifié en base). Toutes
      les données de test supprimées après vérification (y compris les
      photos orphelines sur disque laissées par une suppression
      d'utilisateur faite directement en base pour le nettoyage).
- [x] Build + typecheck backend et frontend sans erreur.

### Restant / reporté (hors scope de cette session)
- [ ] Système de sanctions à paliers (avertissement → limitation →
      bannissement temporaire → définitif) — actuellement un simple
      raccourci vers `suspend`.
- [ ] Ajustement automatique de `trustScore` suite aux décisions de
      modération.
- [ ] Tests automatisés (Jest) — validation manuelle uniquement.

---

## Correctif : erreurs admin silencieuses + paramètres vides en production

Signalé par l'utilisateur : « je ne peux pas accéder aux paramètres (vides).
Peut-être que je ne suis QUE admin ? Mais si je change mon compte en super
admin, ça n'est pas persistant. » — deux symptômes, deux causes distinctes,
aucun bug de logique métier (le comportement backend était correct dans les
deux cas, mais rien ne l'expliquait à l'écran).

### Diagnostic
1. **« Paramètres vides »** : n'est **pas** un problème de permission — un
   `ADMIN` (pas seulement `SUPER_ADMIN`) a bien accès à
   `GET /admin/settings` depuis la Phase 9. La vraie cause : le `Dockerfile`
   ne lance `npx prisma migrate deploy` qu'au démarrage du conteneur, jamais
   `scripts/seed.js` — la table `settings` (et `categories`) reste donc
   vide sur un déploiement Proxmox tant que `docker compose exec backend
   node scripts/seed.js` n'a pas été lancé manuellement au moins une fois.
   C'était déjà documenté dans `README.md` (§ »Après un déploiement«) mais
   facile à manquer, et rien dans l'UI ne distinguait « vide car pas encore
   seedé » de « vide car pas le droit ».
2. **« Rôle SUPER_ADMIN pas persistant »** : le changement de rôle
   fonctionnait bien côté backend, mais échouait **silencieusement** côté
   frontend. `AdminUsersService.assertCanModerate` interdit à un compte de
   modifier son propre rôle (auto-protection anti-verrouillage, voir Phase
   9) — attendu et correct. Le bug : `AdminUsersView.vue` (comme
   `AdminItemsView`, `AdminCategoriesView`, `AdminReportsView`,
   `AdminSettingsView`) n'avait **aucun `catch`** sur les actions
   (`withBusy`/handlers de statut/suppression) : une requête rejetée levait
   une exception non affichée, la liste n'était pas rechargée, et le
   `<select>` du rôle revenait visuellement à sa valeur d'origine au
   prochain re-rendu — donnant l'impression trompeuse d'un changement « qui
   ne prend pas », alors que le backend avait correctement renvoyé un
   message d'erreur explicite ignoré par l'UI.

### Décisions
- **`scripts/seed.js` ajouté à la commande de démarrage du conteneur**
  (`backend/Dockerfile`) : `npx prisma migrate deploy && node scripts/seed.js
  && node dist/main.js`. Sûr à exécuter à chaque redémarrage — le script est
  déjà idempotent (`if (!existing) create`, ne touche jamais une valeur
  déjà modifiée depuis l'admin, vérifié en relisant `scripts/seed.js` avant
  ce changement). Élimine la classe de bug entière pour tous les futurs
  déploiements/mises à jour, pas seulement un correctif ponctuel.
- **Affichage d'erreur ajouté sur les 5 vues admin** (`AdminUsersView`,
  `AdminItemsView`, `AdminCategoriesView`, `AdminReportsView`,
  `AdminSettingsView`) : chaque action mutante capture désormais l'échec et
  affiche `error.response.data.error.message` (même convention que le reste
  du frontend), au lieu de le laisser silencieusement disparaître.
- **`AdminUsersView.vue` : ligne de l'utilisateur connecté marquée « (vous) »**,
  avec le rôle, la suspension, le bannissement et la suppression désactivés
  sur sa propre ligne (plutôt que de laisser l'action échouer après coup) —
  chaque contrôle désactivé porte un `title` expliquant pourquoi (« Tu ne
  peux pas modifier ton propre rôle. », etc.), visible au survol. La
  validation d'email reste active sur soi-même (le backend ne la bloque pas).
- **Rappel pour l'utilisateur (pas un correctif de code)** : pour devenir
  `SUPER_ADMIN` depuis un compte déjà `ADMIN`, seule une autre session
  `SUPER_ADMIN` ou un accès serveur direct le permettent — via
  `docker compose exec backend node scripts/promote-admin.js <email>
  SUPER_ADMIN` puis se déconnecter/reconnecter (le rôle est embarqué dans
  le cookie JWT à la connexion). C'est intentionnel (§5 : seul un Super
  Administrateur gère les rôles admin) et non un bug.

### Fait
- [x] `backend/Dockerfile` : seed automatique et idempotent au démarrage.
- [x] `frontend/src/views/admin/{AdminUsersView,AdminItemsView,
      AdminCategoriesView,AdminReportsView,AdminSettingsView}.vue` :
      capture et affichage des erreurs sur toutes les actions mutantes.
- [x] `AdminUsersView.vue` : détection `isSelf()`, libellé « (vous) »,
      contrôles d'auto-modération désactivés avec `title` explicatif.
- [x] Testé de bout en bout : compte de test promu `ADMIN` (pas
      `SUPER_ADMIN`) via `promote-admin.js`, vérifié dans le navigateur que
      (1) sa propre ligne affiche « (vous) » avec rôle/suspendre/bannir/
      supprimer désactivés et un tooltip au survol, (2) tenter de nommer un
      **autre** compte `SUPER_ADMIN` affiche bien « Seul un Super
      Administrateur peut gérer les rôles administrateurs. » au lieu
      d'échouer en silence, (3) `/admin/parametres` se charge normalement
      pour un simple `ADMIN` en local (seedé) — confirmant que le
      problème initial de l'utilisateur était bien l'absence de seed en
      production, pas un problème de rôle.
- [x] Build frontend sans erreur (aucun changement backend compilé —
      seul le `Dockerfile`, non concerné par `nest build`).

### Restant / reporté
- [ ] Rappeler à l'utilisateur de lancer manuellement
      `docker compose exec backend node scripts/seed.js` **une fois** sur
      le déploiement Proxmox existant (le correctif Dockerfile ne s'applique
      qu'aux futurs rebuilds — un conteneur déjà construit doit être
      reconstruit, ou le seed lancé à la main pour combler l'absence
      actuelle sans attendre un rebuild).

---

## Session v0.2.0 — Correctifs et améliorations multiples

Demande utilisateur : corriger plusieurs bugs et ajouter des fonctionnalités
en une seule session.

### Décisions prises pendant cette session
- **Confirm password obligatoire à l'inscription** (front + back). Le DTO
  `RegisterDto` accepte `confirmPassword`, le service vérifie la cohérence
  côté serveur, le frontend affiche un 2ᵉ champ et vérifie aussi
  côté client. Message d'erreur explicite si discordance.
- **Métadonnées de connexion capturées à l'inscription et au login** :
  `registrationIp`, `registrationUserAgent`, `registrationOs`,
  `registrationBrowser` (inscription) + `lastLoginAt`, `lastLoginIp`,
  `lastLoginUserAgent`, `lastLoginOs`, `lastLoginBrowser` (login). Parsing
  user-agent natif (pas de dépendance additionnelle) — extraction OS
  (Windows/macOS/Linux/Android/iOS) et navigateur (Chrome/Firefox/Edge/
  Opera/Safari). Toutes ces infos visibles dans l'admin utilisateurs.
- **Console SQL réservée SUPER_ADMIN** : `AdminSqlController` avec deux
  endpoints — `POST /admin/sql/tables` (liste toutes les tables SQLite) et
  `POST /admin/sql/exec` (exécute une requête SELECT uniquement, les
  mutations sont bloquées côté service). Vue `AdminSqlView` avec sélection
  rapide de table et rendu en tableau.
- **"Vider la base" réservé SUPER_ADMIN** : `DELETE /admin/items` (sans
  paramètre ID) supprime tous les Monstres (cascade DB + nettoyage photos
  disque). Bouton rouge avec double confirmation dans `AdminItemsView`.
- **Images corrigées dans admin/monstres** : `AdminItemsService` préfixe
  désormais les chemins photos avec `IMG_BASE_URL` (était un chemin relatif
  absolu dans les réponses admin, les images ne chargeaient pas).
- **Avatar emoji** : 32 emojis prédéfinis, sélection/désélection en un clic.
  Stocké dans `User.avatar` (déjà existant, nullable). Endpoint
  `PATCH /users/me/avatar` ajouté. Affiché dans le profil et la liste
  communautaire.
- **Caméra par défaut à la création** : le premier bouton « Photo » utilise
  `capture="environment"` pour ouvrir l'appareil photo sur mobile. Le
  2ᵉ bouton « Galerie » permet de choisir depuis la galerie (sans
  `capture`). Expérience desktop inchangée (les deux ouvrent le sélecteur
  de fichier).
- **Géocodage inverse automatique** : à la géolocalisation et au déplacement
  du marqueur, un appel Nominatim `reverse` est fait pour remplir le champ
  `address` automatiquement. L'adresse pré-remplie est affichée dans
  l'étape 2 et dans le récapitulatif. Headers `User-Agent` ajoutés
  aux appels Nominatim (conformes à leur politique d'utilisation).
- **Nav bar plus grosse** : icônes emoji + texte empilés verticalement,
  padding `py-3` maintenu, `text-lg` pour les icônes. Plus lisible sur
  mobile.
- **Bug mot de passe oublié** : le flow existant était correct techniquement
  (token généré, email envoyé, formulaire de réinitialisation fonctionnel).
  Le problème probable était une mauvaise configuration `FRONTEND_URL` en
  production (l'email contenait un lien vers localhost au lieu de
  `monstres.fbc.fr`). Pas de changement de code nécessaire côté backend
  pour ce point ; le flow a été renforcé avec la confirmation de mot de
  passe.
- **Migration** : `20260722100000_add_user_metadata` — 9 nouvelles colonnes
  sur `users` (métadonnées inscription + login). Pas de `RedefineTables`,
  pas de perte de données.

### Fait
- [x] Backend : `schema.prisma` étendu (9 colonnes métadonnées sur `User`).
- [x] Backend : migration `20260722100000_add_user_metadata` appliquée.
- [x] Backend : `AuthService.register()` capture IP/UA/OS/browser via `Request`.
- [x] Backend : `AuthService.login()` enregistre les métadonnées de connexion.
- [x] Backend : `RegisterDto.confirmPassword` + vérification dans `AuthService`.
- [x] Backend : `AdminSqlController`/`AdminSqlService` (tables + exec SELECT).
- [x] Backend : `AdminItemsService.removeAll()` + endpoint `DELETE /admin/items`.
- [x] Backend : `AdminItemsService` corrige les URLs photos (préfixe `IMG_BASE_URL`).
- [x] Backend : `UsersController.PATCH /users/me/avatar` + `UsersService.updateAvatar`.
- [x] Frontend : `RegisterView` avec champ confirmation mot de passe.
- [x] Frontend : `AdminUsersView` affiche OS, navigateur, IP, dernière connexion.
- [x] Frontend : `AdminSqlView` (console SQL, sélection tables, rendu tableau).
- [x] Frontend : `AdminItemsView` avec bouton "Vider la base" (SUPER_ADMIN).
- [x] Frontend : `AdminLayout` avec onglet "Console SQL" conditionnel.
- [x] Frontend : `ProfileView` avec sélection d'avatar emoji.
- [x] Frontend : `AddItemView` — caméra par défaut + géocodage inverse auto.
- [x] Frontend : `BottomNav` avec icônes + texte plus gros.
- [x] Frontend : route `/admin/sql` avec garde `requiresSuperAdmin`.
- [x] Version bumpée à 0.2.0 (backend + frontend synchronisés).
- [x] Build backend et frontend sans erreur.

---

## Correctif de sécurité : console SQL réellement en lecture seule

Cette session a repris la main juste après le commit v0.2.0 (fait par une
autre session/outil IA en parallèle sur ce dépôt, cf. notes précédentes sur
la coordination multi-sessions). En relisant ce commit avant de continuer,
la console SQL (`AdminSqlService.exec`) posait un problème de sécurité
réel : la « lecture seule » n'était qu'un contrôle sur le **premier mot**
de la requête (`INSERT`/`UPDATE`/`DELETE`/… interdits), contournable
trivialement par un commentaire SQL placé avant le mot interdit
(`/* x */ DELETE FROM users`) — le premier "mot" devient `/*`, qui ne
matche aucun terme de la liste, et la requête complète (y compris la
suppression) partait sur la connexion partagée avec `PrismaService`, qui
peut écrire. Signalé à l'utilisateur avant de continuer (question posée :
supprimer la console / la durcir / la laisser telle quelle) — réponse :
**la durcir**.

### Décision
- **Connexion SQLite dédiée, distincte de `PrismaService`**, ouverte avec
  `PRAGMA query_only = ON` dès `onModuleInit` et jamais désactivée : la
  garantie de lecture seule est maintenant appliquée par le moteur SQLite
  lui-même, plus par une inspection de chaîne de caractères. Un contournement
  par commentaire produit désormais une erreur SQLite explicite
  (`SQLITE_READONLY: attempt to write a readonly database`) au lieu de
  s'exécuter silencieusement.
- **`PRAGMA busy_timeout = 3000`** sur cette même connexion, en prévision
  d'un léger conflit de verrou avec la connexion d'écriture de Prisma.
- **Timeout applicatif de 5 s** (`Promise.race`) sur chaque requête, pour
  éviter qu'une requête coûteuse ne bloque indéfiniment la réponse.
- **Le filtre par mot-clé est conservé**, mais uniquement comme confort
  UX (message clair immédiat sur le cas évident) — ce n'est plus la
  garantie de sécurité, qui repose entièrement sur `query_only`. `PRAGMA`
  ajouté à la liste des mots bloqués par ce filtre (dans le cas où
  quelqu'un tenterait de désactiver `query_only` sur sa propre requête,
  bien que cela n'aurait aucun effet sur la connexion dédiée de toute façon).

### Fait
- [x] `backend/src/admin/admin-sql.service.ts` réécrit : connexion `@libsql/client`
      dédiée (`createClient`), `onModuleInit`/`onModuleDestroy`, timeout.
- [x] Testé de bout en bout avec un compte SUPER_ADMIN de test : `SELECT`
      normal fonctionne, tentative d'écriture directe bloquée par le filtre
      UX, **tentative de contournement par commentaire
      (`/* x */ DELETE FROM users WHERE email=...`) bloquée par le moteur
      SQLite** (vérifié : le compte ciblé existe toujours après la
      tentative), accès refusé pour un compte `ADMIN` simple (réservé
      `SUPER_ADMIN`). Compte de test supprimé après vérification.
- [x] Build backend sans erreur.

---

## Correctifs de compilation post-v0.2.0 (session parallèle)

En reprenant la main après le commit v0.2.0 (tutoriel d'onboarding, éditeur
de templates email, métadonnées utilisateur — fait par une autre session/
outil IA en parallèle sur ce dépôt), le backend ne compilait plus : deux
nouveaux contrôleurs avaient des chemins d'import incorrects.

- **`backend/src/admin/admin-tutorial.controller.ts`** et
  **`admin-email-templates.controller.ts`** utilisaient `../../auth/...`
  alors qu'ils sont placés directement dans `src/admin/` (même profondeur
  que les autres contrôleurs admin) — corrigé en `../auth/...`.
- **`admin-email-templates.controller.ts`** importait aussi
  `./email-templates.service` (fichier inexistant à cet endroit) au lieu de
  `../email-templates/email-templates.service`.
- Côté frontend, **`AdminEmailTemplatesView.vue`** et **`AdminTutorialView.vue`**
  importaient `api`/`ApiSuccess` depuis `@/services/admin` (qui ne les
  ré-exporte pas) au lieu de `@/services/api` — corrigé.

Aucun changement fonctionnel, uniquement des chemins d'import cassés qui
empêchaient `nest build`/`vue-tsc` de passer. Signalé ici pour qu'une
session future ne perde pas de temps si ça se reproduit avec d'autres
fichiers ajoutés en parallèle.

---

## Phase 11 — Facebook (+ Google) : terminée et validée, refonte graphique complète

Demande utilisateur (un seul message, deux volets) : refaire entièrement
l'expérience visuelle avec un graphisme "moderne et élégant" en utilisant
les 3 images fournies à la racine du dépôt (`monstres.jpg` en image
d'accueil, `LOGO.jpg` et `icone app.jpg` comme logo/icônes d'application),
**puis** construire la connexion Google et Facebook et continuer le plan
(Phase 11 du cahier des charges, jusque-là explicitement mise en attente
d'une confirmation explicite — donnée dans ce message).

### Décisions — identité visuelle
- **Palette de marque extraite par échantillonnage de pixels** des 3 images
  fournies (script Node + `sharp`, lecture de buffers raw à des coordonnées
  précises) plutôt que choisie à l'œil : teal `#56b2b1` (fond de l'icône) →
  `brand-400`, encre foncée `#0a2e31` (texte du logo) → `brand-900`, orange
  `#e38e49` (taches du monstre) → `accent-500`. Rampe 50–900 complète
  définie via `@theme` dans `style.css` (Tailwind v4, CSS-first). **Tout le
  frontend est passé de `violet-*` à `brand-*`** par remplacement mécanique
  (`sed`) sur les 20 fichiers concernés, plus les couleurs hexadécimales en
  dur dans `MapView.vue` (marqueurs Leaflet).
- **Police** : `Plus Jakarta Sans` (variable, via `@fontsource-variable`)
  — moderne, lisible, un peu plus chaleureuse qu'`Inter` sans tomber dans le
  puéril, cohérent avec "élégant" plutôt que "ludique" malgré la mascotte.
- **Assets générés depuis les images sources** (`backend/scripts/generate-
  brand-assets.js`, ponctuel, pas un script npm) :
  - Icônes PWA/favicon depuis `icone app.jpg` : recadrage du carré arrondi
    (`trim` + rognage supplémentaire pour éliminer le liseré blanc résiduel
    de l'anti-aliasing JPEG), déclinées en 32/180/192/512 + une version
    "maskable" 512×512 sur fond teal plein (zone de sécurité ~80%, aucun
    détail coupé par le masque circulaire/arrondi d'un OS).
  - Logo à fond transparent depuis `LOGO.jpg` (fond blanc pur à l'origine) :
    chroma-key manuel par manipulation de buffer raw RGBA (alpha = fonction
    de `255 - min(R,G,B)`, pas de librairie dédiée) — utilisé sur les pages
    Connexion/Inscription, posé sur une pastille blanche pour rester lisible
    même en dark mode plutôt que de chasser un fondu parfait sur fond
    sombre.
  - `favicon.svg` (placeholder violet "M") supprimé, remplacé par les PNG
    générés ; `vite.config.ts` (manifest PWA) et `index.html` mis à jour en
    conséquence.
- **`BottomNav.vue` refaite avec des icônes SVG line-art** (à la main, pas de
  librairie d'icônes ajoutée) au lieu des emoji — plus conforme à "élégant".
  Le bouton "Ajouter" devient un FAB circulaire surélevé au-dessus de la
  barre (`ring-4 ring-white`, ombre teintée `brand-600/30`), pattern courant
  d'app mobile moderne pour l'action principale.
- **`HomeView.vue`** : bandeau hero `monstres.jpg` en pleine largeur (`object-
  cover`, dégradé `brand-900` vers transparent en overlay, coins arrondis en
  bas), cartes de Monstres remontées en `rounded-2xl` + ombre légère +
  pastille de catégorie colorée. Reste des pages (Profil, Communauté, détail
  Monstre, vues admin) : rebrand de couleur uniquement, pas de refonte de
  mise en page bespoke — proportionné au temps disponible, la cohérence de
  palette suffit à donner un rendu homogène "moderne et élégant" à
  l'ensemble sans réécrire chaque vue en profondeur.
- **`LoginView.vue`/`RegisterView.vue` réécrites** : logo en tête, carte
  blanche arrondie centrée (`max-w-sm`), séparateur "ou" avant les boutons
  Google/Facebook.

### Décisions — connexion Google/Facebook
- **`passport-google-oauth20` + `passport-facebook`**, une stratégie par
  fournisseur (`google.strategy.ts`/`facebook.strategy.ts`), qui normalisent
  le profil OAuth en un type commun `OAuthProfile` (provider, providerId,
  email, name, avatar).
- **Les stratégies se construisent même sans credentials configurées**
  (fallback `'not-configured'` sur `clientID`/`clientSecret`) — sinon
  `passport-google-oauth20`/`passport-facebook` lèvent une exception
  **synchrone au démarrage** du provider Nest, ce qui aurait planté tout le
  backend tant que l'utilisateur n'a pas créé ses apps OAuth. La vraie garde
  est `GoogleAuthGuard`/`FacebookAuthGuard` : si `CLIENT_ID`/`CLIENT_SECRET`
  manquent, le guard redirige directement vers
  `/connexion?error=google_unavailable` (ou `facebook_unavailable`) **avant**
  d'invoquer `passport.authenticate()`, plutôt que de laisser l'utilisateur
  atterrir sur une erreur OAuth confuse côté Google/Facebook.
- **`AuthService.loginWithOAuth(profile)`** : cherche un `SocialAccount`
  existant (clé composite `provider_providerId`) ; à défaut, cherche un
  `User` par email pour **rattacher** le fournisseur à un compte existant
  (évite un doublon si quelqu'un s'inscrit d'abord par email puis se
  connecte ensuite via Google avec la même adresse) ; sinon crée un nouveau
  compte avec un mot de passe aléatoire inutilisable (bcrypt d'un
  `randomBytes(32)`) — ce compte ne se connecte qu'en repassant par le même
  fournisseur, sauf s'il utilise "mot de passe oublié" pour s'en définir un.
  `emailVerifiedAt` posé immédiatement (l'email est déjà vérifié par le
  fournisseur OAuth, pas de second envoi de vérification). Même contrôle
  banni/suspendu que la connexion classique.
- **Paramètre `redirect` transmis via `state` OAuth** (pas de session
  serveur) : `GoogleAuthGuard`/`FacebookAuthGuard` surchargent
  `getAuthenticateOptions()` pour lire `?redirect=` sur la requête initiale
  et le renvoyer en `state`, récupéré côté callback (`req.query.state`) pour
  rediriger l'utilisateur vers la bonne page après connexion (ex. revenir
  sur `/ajouter` s'il a été redirigé vers `/connexion` depuis là).
- **Email Facebook potentiellement absent** (utilisateur qui refuse la
  permission) : email de repli synthétique
  `{provider}-{providerId}@users.noreply.monstres.fbc.fr` — le compte reste
  utilisable, juste toujours via ce même fournisseur (pas de mot de passe
  oublié possible sur une fausse adresse).
- **`.env.example` (racine + `backend/`) documentés** avec les URI de
  redirection exactes à déclarer côté Google Cloud Console / Facebook
  Developers. `GOOGLE_CLIENT_SECRET`/`FACEBOOK_CLIENT_ID`/
  `FACEBOOK_CLIENT_SECRET` restent vides — **l'utilisateur doit créer ses
  propres apps OAuth** pour activer réellement ces boutons ; en attendant,
  ils échouent proprement (message clair, reste de l'app non affecté).

### Fait
- [x] `frontend/src/style.css` : palette `brand-*`/`accent-*` (`@theme`),
      police `Plus Jakarta Sans Variable`.
- [x] `backend/scripts/generate-brand-assets.js` : génération des icônes
      PWA/favicon + logo transparent depuis les 3 images fournies.
- [x] `frontend/index.html`, `vite.config.ts` : favicon/manifest PWA mis à
      jour avec les nouvelles icônes, `theme_color` aligné sur `brand-600`.
- [x] Rebrand `violet-*` → `brand-*` sur 20 fichiers Vue + hex codes de
      `MapView.vue`.
- [x] `BottomNav.vue` réécrit (icônes SVG, FAB "Ajouter" surélevé).
- [x] `HomeView.vue` réécrite (hero `monstres.jpg`, cartes modernisées).
- [x] `LoginView.vue`/`RegisterView.vue` réécrites (logo, carte, boutons
      OAuth, affichage d'erreur `?error=...`).
- [x] Backend : `google.strategy.ts`, `facebook.strategy.ts`,
      `guards/google-auth.guard.ts`, `guards/facebook-auth.guard.ts`,
      `AuthService.loginWithOAuth()`, routes `GET /auth/google`,
      `/auth/google/callback`, `/auth/facebook`, `/auth/facebook/callback`.
- [x] `.env.example` (racine + `backend/`) : instructions de configuration
      OAuth (URI de redirection).
- [x] Testé de bout en bout : guards vérifiés en conditions réelles (sans
      credentials configurées → redirection propre
      `/connexion?error=..._unavailable`, vérifié par `curl -i` et dans le
      navigateur avec le message affiché) ; logique
      `loginWithOAuth`/`SocialAccount` testée directement contre `dev.db`
      (création d'un nouveau compte, réutilisation au 2e appel avec le même
      profil, **rattachement correct à un compte existant** quand un
      second fournisseur partage le même email) — les 3 scénarios
      confirmés corrects, compte de test nettoyé après coup. Impossible de
      tester le flux complet jusqu'au consentement Google/Facebook réel
      sans que l'utilisateur crée ses apps OAuth (voir `.env.example`).
      Redesign vérifié visuellement dans le navigateur : accueil, connexion/
      inscription, communauté, profil, détail d'un Monstre.
- [x] Build backend et frontend sans erreur.

### Restant / reporté
- [ ] **Connexion Google/Facebook non fonctionnelle tant que l'utilisateur
      n'a pas créé ses propres apps OAuth** (Google Cloud Console /
      Facebook Developers) et renseigné `GOOGLE_CLIENT_SECRET`,
      `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` — voir `.env.example`
      pour les URI de redirection exactes à déclarer.
- [ ] Refonte visuelle bespoke des vues admin (au-delà du rebrand de
      couleur) — non demandée explicitement, jugée hors scope vu le temps
      disponible.
- [ ] Icône maskable : un très léger liseré plus clair reste visible au zoom
      sur les bords arrondis (artefact JPEG résiduel) — acceptable en usage
      normal, pourrait être retouché avec une source vectorielle si besoin.

---

## Session v0.3.1 — Tutoriel onboarding + Éditeur templates emails

### Demandes
1. Créer un tutoriel multi-pages fonctionnel pour les nouveaux utilisateurs
   (explique comment l'application fonctionne et les règles de respect).
   Modifiable dans /admin.
2. Créer dans /admin un éditeur de templates d'emails (style APM) avec
   éditeur WYSIWYG et prévisualisation HTML.

### Décisions prises
- **Modèle `TutorialPage`** : pages ordonnées (order), titre, contenu HTML,
  icône emoji, actif/inactif. CRUD admin complet.
- **Modèle `EmailTemplate`** : clé unique par type d'email, contenu HTML,
  sujet, flag `isSystem` (templates système non supprimables). Les templates
  sont cherchés en DB par le `EmailService` et `NotificationsService`, avec
  fallback sur le HTML codé en dur si le template n'existe pas.
- **Champ `onboardingCompletedAt`** ajouté au modèle `User` (0/null = pas
  fait, date = terminé). Le guard router redirige vers `/tutoriel` après
  login si non terminé.
- **Variables templates** : `{{user_name}}`, `{{item_title}}`, `{{item_url}}`,
  `{{item_photo_url}}`, `{{verification_url}}`, `{{reset_url}}`,
  `{{badge_name}}`, `{{reserver_name}}`, `{{collector_name}}`.
- **WYSIWYG** : `@vueup/vue-quill` (équivalent Vue 3 de react-quill utilisé
  dans APM). Éditeur code HTML avec toolbar basique + prévisualisation iframe.
- **Contenu par défaut tutoriel** : 4 pages (Bienvenue, Comment ça marche,
  Règles de respect, La communauté).
- **Templates par défaut** : 6 templates système (email_verification,
  password_reset, new_item_nearby, reservation_created, item_collected,
  badge_unlocked) avec HTML styled inline.

### Fait
- [x] Schema Prisma : `TutorialPage`, `EmailTemplate`, `User.onboardingCompletedAt`
- [x] Migration `20260722120000_add_tutorial_and_email_templates` appliquée
- [x] Backend : `TutorialModule` (service + controller) — pages actives + completion
- [x] Backend : `AdminTutorialController` — CRUD admin pages tutoriel
- [x] Backend : `EmailTemplatesModule` (service + controller) — CRUD + preview
- [x] Backend : `AdminEmailTemplatesController` — CRUD admin templates
- [x] Backend : `EmailService` modifié — cherche templates en DB, fallback HTML dur
- [x] Backend : `NotificationsService` modifié — même pattern DB + fallback
- [x] Backend : seed avec 4 pages tutoriel + 6 templates email
- [x] Backend : `SafeUser` inclut `onboardingCompletedAt`
- [x] Frontend : `TutorialView.vue` — multi-pages, progress bar, skip/prev/next
- [x] Frontend : `AdminTutorialView.vue` — CRUD, prévisualisation inline
- [x] Frontend : `AdminEmailTemplatesView.vue` — WYSIWYG Quill, variables, preview
- [x] Frontend : router guard redirige vers `/tutoriel` si onboarding pas fait
- [x] Frontend : routes `/tutoriel`, `/admin/tutoriel`, `/admin/mails`
- [x] Frontend : AdminLayout avec onglets "Tutoriel" et "Mails"
- [x] Frontend : auth store/service avec `onboardingCompletedAt`
- [x] Build backend + frontend sans erreur

---

## Correctif de sécurité (bis) : régression sur la console SQL admin

En reprenant la main pour aider l'utilisateur à configurer Google/Facebook,
constat : le commit `b76273e` ("v0.3.2 : pastilles dashboard admin + fix
console SQL tables", fait entre-temps) avait **réverté** le correctif de
sécurité de la console SQL (`## Correctif de sécurité : console SQL
réellement en lecture seule` ci-dessus) — retour à la connexion Prisma
partagée (capable d'écrire) protégée par le seul filtre de premier-mot,
recontournable par un commentaire SQL (`/* x */ DELETE FROM users`). Very
probablement un effet de bord non intentionnel : le message du commit
("fix console SQL tables") suggère que la connexion SQLite dédiée
(`@libsql/client` séparé + `PRAGMA query_only`) causait un problème sur
`listTables()`, et la correction a réintroduit la faille en même temps
qu'elle réglait ce bug.

### Décision
Plutôt que de relancer une 2e connexion dédiée (source du bug précédent,
cause exacte non identifiée — possible conflit de verrou SQLite entre les
deux connexions persistantes sur le même fichier), le correctif reste sur
la connexion Prisma partagée (qui marchait pour `listTables`) mais durcit
la **validation lexicale** de la requête avant exécution :
- Commentaires SQL (`--` et `/* */`) retirés avant toute inspection — un
  mot interdit caché derrière un commentaire ne passe plus inaperçu.
- Requêtes empilées (plusieurs instructions séparées par `;`) refusées
  explicitement.
- **Liste blanche** (la requête nettoyée doit commencer par `SELECT` ou
  `WITH`) plutôt qu'une liste noire de mots interdits — SQLite n'autorise
  de toute façon aucune écriture dans une CTE (`WITH ... AS (...)`),
  contrairement à Postgres, donc l'autoriser ne rouvre pas la faille.

### Fait
- [x] `backend/src/admin/admin-sql.service.ts` réécrit (validation
      lexicale, connexion Prisma partagée conservée).
- [x] Testé de bout en bout avec un compte SUPER_ADMIN de test :
      `listTables()` fonctionne, `SELECT` normal fonctionne, tentative de
      contournement par commentaire bloquée (comme avant sa
      réintroduction), **requête empilée (`SELECT 1; DELETE FROM users`)
      également bloquée** (cas non couvert par le tout premier correctif),
      compte ciblé confirmé toujours présent après les deux tentatives.
      Accès refusé pour un compte `ADMIN` simple (inchangé). Compte de
      test supprimé après vérification.
- [x] Build backend sans erreur.

### Aide apportée : configuration Google/Facebook
L'utilisateur a renseigné `GOOGLE_CLIENT_ID` dans le `.env` de production
(Proxmox) mais pas encore `GOOGLE_CLIENT_SECRET`. Vérifié en local
(`backend/.env`, `GOOGLE_CLIENT_ID` renseigné avec sa vraie valeur,
`GOOGLE_CLIENT_SECRET` vide) : `GET /auth/google` redirige bien vers
`/connexion?error=google_unavailable` — confirme que **les deux valeurs
sont requises**, le `CLIENT_ID` seul ne suffit pas. Marche à suivre donnée
en chat pour récupérer le secret (Google Cloud Console → APIs & Services →
Identifiants → cliquer sur le client OAuth existant → "Client secret") et
pour créer une app Facebook complète (developers.facebook.com → Créer une
app → produit "Facebook Login" → URI de redirection OAuth valide →
Paramètres → Basique pour l'ID/secret de l'app), y compris l'avertissement
qu'une app Facebook en mode développement ne laisse se connecter que les
développeurs/testeurs déclarés tant qu'elle n'est pas passée en mode Live
(bascule qui demande une politique de confidentialité et une revue de
l'app par Facebook pour la permission de login).

### Restant / reporté
- [ ] `GOOGLE_CLIENT_SECRET` à renseigner par l'utilisateur (Google Cloud
      Console, même projet que `GOOGLE_CLIENT_ID`).
- [x] App Facebook créée par l'utilisateur — `FACEBOOK_CLIENT_ID`/
      `FACEBOOK_CLIENT_SECRET` renseignés dans `backend/.env` **local**
      uniquement et vérifiés (`GET /auth/facebook` redirige bien vers le
      vrai dialogue de consentement Facebook avec le bon `client_id`).
      **Pas encore reportés dans le `.env` de production** (Proxmox) — à
      faire par l'utilisateur, puis redémarrer le conteneur backend.

---

## Mise en conformité soumission Facebook (icône, RGPD, suppression de données)

Facebook a refusé la soumission de l'app pour 4 champs manquants : icône
1024×1024, URL de politique de confidentialité, instructions de
suppression des données utilisateur, catégorie.

### Fait
- [x] **Icône 1024×1024** générée depuis `icone app.jpg` (`sharp`, `trim()`
      puis `resize({ fit: 'contain' })` sur fond blanc — un premier essai
      avec `fit: 'cover'` sur un crop trop serré rognait les coins arrondis,
      corrigé). Fichier `fb-app-icon-1024.png` à la racine, **non versionné**
      (livrable ponctuel pour upload manuel sur le dashboard Facebook), à
      uploader par l'utilisateur puis supprimable.
- [x] **URL de politique de confidentialité** : page publique existante
      `/rgpd` (créée par la session parallèle, contenu RGPD complet) réutilisée
      telle quelle — accessible sans authentification, pas de garde de route.
      URL à déclarer : `https://monstres.fbc.fr/rgpd`.
- [x] **Suppression des données utilisateur** :
  - Backend : `DELETE /users/me` (`UsersService.deleteSelf`) — supprime
    l'utilisateur (cascade Prisma sur ses Monstres/réservations/etc.) puis
    ses photos sur disque, efface le cookie de session. Testé de bout en
    bout via un compte jetable (`curl` : login → `DELETE /users/me` → 200
    `{"deleted":true}` → `GET /auth/me` suivant renvoie 404 "Utilisateur
    introuvable", compte confirmé disparu de `dev.db`).
  - Frontend : bouton "Supprimer mon compte" sur `/profil` (déjà en place,
    session précédente) + nouvelle page publique **`/suppression-donnees`**
    (`DataDeletionView.vue`) expliquant la marche à suivre (via le compte,
    ou par email si le compte est inaccessible), destinée au champ Facebook
    "URL des instructions de suppression des données". Lien ajouté depuis
    `/profil`.
  - URL à déclarer côté Facebook : `https://monstres.fbc.fr/suppression-donnees`.
- [x] **Catégorie** : aucun code requis, simple menu déroulant côté
      dashboard Facebook App Review — suggestion donnée à l'utilisateur en
      chat (catégorie "Communauté" ou "Utilitaires et productivité" selon
      les options disponibles dans son dashboard).
- [x] Classes Tailwind `violet-*` oubliées corrigées en `brand-*` dans
      `LegalView.vue` et `RgpdView.vue` (loupées par le rebrand initial car
      créées après par la session parallèle).
- [x] Build backend + frontend sans erreur, testé en navigateur (page
      `/suppression-donnees` affichée, lien visible sur `/profil`,
      formulaire d'inscription + boutons OAuth fonctionnels).

### Restant
- [ ] Ajouter `FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET`/
      `GOOGLE_CLIENT_SECRET` dans le `.env` de **production** (Proxmox) —
      accès local uniquement depuis cette session, l'utilisateur doit le
      faire lui-même puis redémarrer le conteneur backend.
- [ ] Soumettre l'app Facebook à la revue une fois les 4 champs + les
      identifiants prod en place.

---

## Correctifs suite au premier test réel de connexion Facebook (v0.3.6)

L'utilisateur a testé la connexion Facebook en conditions réelles (app en
mode développement, lui-même comme testeur déclaré) et remonté 2 problèmes.

### 1. Email de compte = adresse factice non joignable
Le compte créé avait pour email
`facebook-{providerId}@users.noreply.monstres.fbc.fr` — un **placeholder
interne** généré par `AuthService.loginWithOAuth()`
(`backend/src/auth/auth.service.ts:164`) uniquement quand Facebook ne
renvoie aucun email, pour satisfaire la contrainte d'unicité de la colonne
`email`. Ce n'est pas censé être une adresse joignable ; le bounce
("domaine introuvable") est attendu pour un placeholder, **mais le vrai
bug est que Facebook n'a jamais renvoyé le véritable email de
l'utilisateur.**
- **Cause** : `FacebookStrategy` (`backend/src/auth/facebook.strategy.ts`)
  listait bien `emails` dans `profileFields`, mais **ne demandait jamais la
  permission OAuth `email`** (`scope`) — contrairement à `GoogleStrategy`
  qui a `scope: ['email', 'profile']`. Sans cette permission explicitement
  demandée dans le dialogue de consentement Facebook, l'API ne renvoie
  jamais le champ email même si `profileFields` le liste.
- **Correctif** : ajout de `scope: ['email']` au constructeur de
  `FacebookStrategy`. Les prochaines connexions Facebook demanderont bien
  la permission email et l'utiliseront si l'utilisateur l'accorde (le
  placeholder reste en fallback pour le cas, plus rare, où l'utilisateur
  refuse explicitement cette permission).
- **Le compte déjà créé avec l'email factice n'est pas corrigé
  automatiquement** — il faudra soit le supprimer et se reconnecter via
  Facebook (le correctif de scope s'appliquera), soit changer son email
  manuellement en base.

### 2. Photo de profil Facebook affichée en texte brut au lieu d'une image
Deux bugs distincts empilés :
- **Bug latent pré-existant** (avatar upload local, `ImageService.
  processAvatar` — `backend/src/images/image.service.ts:70`) : la valeur
  stockée en base est un chemin relatif (`avatars/{userId}/{fichier}`),
  jamais préfixé par `IMG_BASE_URL` contrairement aux photos de Monstres
  (`ItemsService` le fait déjà). `UsersService` renvoyait ce chemin brut
  tel quel dans `toSafeUser`/`findPublicProfile`/`findCommunity`.
- **Bug frontend** (`ProfileView.vue`) : l'affichage ne testait que
  `selectedAvatar?.startsWith('/')` (chemin local) ou repli emoji — une URL
  absolue Facebook/Google (`https://platform-lookaside.fbsbx.com/...`) ne
  matchait ni l'un ni l'autre et atterrissait dans le `<span>` emoji,
  affichant l'URL en texte brut à la taille de police par défaut (d'où le
  texte énorme superposé au reste de la carte profil sur la capture
  utilisateur).
- **Correctifs** :
  - `UsersService.resolveAvatar()` (nouvelle méthode privée) : renvoie tel
    quel un emoji ou une URL déjà absolue (`http(s)://`, cas Google/
    Facebook), préfixe par `IMG_BASE_URL` un chemin `avatars/...` (cas
    upload local) — appliqué dans les 3 endroits qui exposaient
    `user.avatar` brut.
  - `ProfileView.vue` : nouveau `isImageAvatar` computed testant
    `/^(\/|https?:\/\/)/` au lieu du seul `startsWith('/')` — couvre à la
    fois les anciens chemins locaux et les URLs absolues OAuth.
- **Testé** : compte de test promu ADMIN temporairement (script Prisma
  ponctuel contre `dev.db`, supprimé après usage) pour passer la règle
  "3 Monstres minimum", upload réel d'une image test via
  `POST /users/me/avatar/upload` → `GET /auth/me` renvoie bien une URL
  absolue `http://localhost:3000/uploads/avatars/.../....webp` (200,
  `image/webp` confirmé), et affichage vérifié en navigateur (cercle avatar
  au lieu du texte brut). Compte de test supprimé après vérification.
- [x] Build backend + frontend sans erreur après les 2 correctifs.

---

## Avatar emoji cassé sur /communaute, et PWA bloquée sur un ancien build (v0.3.7)

L'utilisateur a demandé d'améliorer graphiquement les boutons Google/
Facebook de `/connexion` ("boutons et pas des simples liens"), puis a
remonté que les avatars ne s'affichaient plus du tout sur
`https://monstres.fbc.fr/communaute` (seules les photos personnelles ou
Facebook fonctionnaient).

### 1. Avatar emoji cassé sur la page Communauté
Même bug que celui déjà corrigé sur `/profil` en v0.3.6, mais oublié dans
`CommunityView.vue` : `<img v-if="member.avatar" :src="member.avatar">`
traite n'importe quelle valeur non nulle comme une URL d'image, y compris
un emoji (`"🦊"`) choisi via le sélecteur d'avatar — `<img src="🦊">` est
une image cassée. Seuls les avatars qui sont *réellement* des URLs (upload
local résolu par `UsersService.resolveAvatar()`, ou photo Google/Facebook)
s'affichaient correctement, d'où l'observation de l'utilisateur.
- **Correctif** : nouvelle fonction `isImageAvatar()` (même regex
  `/^(\/|https?:\/\/)/` que `ProfileView.vue`) pour distinguer une URL
  d'un emoji ; repli sur l'affichage de l'emoji (au lieu des seules
  initiales) si l'avatar n'est pas une image.
- **Testé** : compte de test avec avatar emoji 🦊 créé via API, confirmé
  affiché correctement sur `/communaute` en navigateur, compte supprimé
  après vérification.

### 2. La demande initiale ("boutons pas assez visibles") était en fait un problème de cache PWA
En comparant le rendu local (`localhost:5173/connexion` : logo, bouton
teal, bouton Google bordé, bouton Facebook bleu — déjà correctement
stylés depuis la Phase 11) avec la production (`monstres.fbc.fr/connexion`
via le navigateur intégré) : **la production affichait l'ancienne page
violette sans logo ni boutons Google/Facebook**, alors que le
`index.html` livré (favicon, `theme-color: #2a7877`) correspondait bien
au tout dernier design. Diagnostic : un **service worker actif restait
bloqué sur l'ancien bundle précaché** et ne se mettait jamais à jour tout
seul — après `navigator.serviceWorker.getRegistrations()[0].unregister()`
+ vidage des caches + rechargement, la page affichait immédiatement le
design à jour (boutons compris). Donc **le code de style était déjà bon
depuis le début** — ce n'était pas un bug graphique mais un bug de mise à
jour de la PWA qui peut affecter n'importe quel visiteur ayant déjà ouvert
le site avant un déploiement.
- **Cause** : `registerType: 'autoUpdate'` était configuré dans
  `vite.config.ts`, mais **le helper `virtual:pwa-register` n'était jamais
  importé/appelé nulle part dans le code** (`frontend/src/main.ts` ne
  faisait qu'un `app.mount('#app')`). Sans cet appel, le navigateur
  enregistre bien le service worker (script auto-injecté par défaut), et
  le nouveau SW s'active bien en tâche de fond (skipWaiting/clientsClaim
  activés par `autoUpdate`), mais **rien ne recharge la page pour que
  l'onglet déjà ouvert prenne la nouvelle version** — un onglet resté
  ouvert (ou une PWA installée jamais fermée) peut rester indéfiniment sur
  l'ancien bundle après un déploiement.
- **Correctif** : `frontend/src/main.ts` appelle maintenant
  `registerSW({ immediate: true, onNeedRefresh() { updateSW(true) } })`
  (import `virtual:pwa-register`) — dès qu'une nouvelle version est
  détectée, elle est activée et la page se recharge automatiquement, sans
  attendre une fermeture manuelle de l'onglet. Déclaration de type ajoutée
  (`/// <reference types="vite-plugin-pwa/client" />` dans
  `vite-env.d.ts`) pour que `vue-tsc` résolve le module virtuel.
- **Testé** : build de production servi en local (`vite preview`),
  service worker enregistré sans erreur console, présence confirmée du
  chunk `workbox-window` dans le build (preuve que `registerSW()` est bien
  utilisé). Impossible de simuler un vrai cycle "ancien SW → nouveau SW"
  en local sans deux déploiements distincts — la garantie vient de la
  logique standard de `registerSW`/`workbox-window`, largement éprouvée.
- **Nginx déjà correct** (`frontend/nginx.conf`) : `sw.js` est bien servi
  en `Cache-Control: no-cache` — ce n'était donc pas un problème de cache
  HTTP côté reverse-proxy, seulement l'absence de rechargement côté client
  une fois la nouvelle version détectée.
- [x] Build backend + frontend sans erreur.

### À surveiller après ce déploiement
Ce correctif ne s'applique qu'aux **futurs** déploiements : la version
actuellement en production doit encore être mise à jour une première fois
"à l'ancienne" (redéploiement normal) pour que les visiteurs récupèrent
enfin ce nouveau service worker auto-actualisant. Une fois ce déploiement
fait, les suivants ne devraient plus jamais laisser un visiteur bloqué sur
une ancienne version.

---

## Page blanche après connexion Facebook/Google (v0.3.8)

L'utilisateur a remonté qu'après une connexion Facebook, l'app restait en
page blanche sur
`https://monstres.fbc.fr/api/v1/auth/facebook/callback?code=...&state=%2Fprofil#_=_`
(le `#_=_` final est un artefact connu du flux Facebook, sans rapport avec
le bug) — mais qu'un rechargement manuel de cette même page fonctionnait.

### Cause
Le service worker généré par `vite-plugin-pwa` enregistre par défaut une
`NavigationRoute` **sans exclusion**, qui intercepte *toute* navigation
(mode `navigate`) sur l'origine et lui sert le shell SPA précaché
(`index.html`) — y compris la redirection que Facebook renvoie vers
`/api/v1/auth/facebook/callback`, qui est une route **backend**, pas une
route Vue Router. Résultat : le navigateur ne fait jamais vraiment la
requête réseau vers ce endpoint (le SW répond directement depuis le
cache), donc `AuthController` ne pose jamais le cookie de session ni ne
redirige vers `/profil` — Vue Router, qui ne connaît pas cette route,
affiche une page vide. Vérifié dans `dist/sw.js` avant correctif :
`registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))`
sans liste d'exclusion.

### Correctif
`frontend/vite.config.ts` : ajout de
`workbox: { navigateFallbackDenylist: [/^\/api\//] }` dans la config
`VitePWA()`. Toute navigation vers `/api/...` est maintenant exclue du
fallback SPA et atteint réellement le réseau (donc le vrai backend), pour
Facebook comme pour Google (même mécanisme, même route de callback).

### Testé
Build de production servi en local (`vite preview`), confirmé via
`dist/sw.js` généré : `NavigationRoute(createHandlerBoundToURL("index.html"),
{denylist:[/^\/api\//]})`. Navigation réelle du navigateur vers
`/api/v1/auth/facebook/callback?...` confirmée comme un vrai aller-retour
réseau via `performance.getEntriesByType('navigation')`
(`nextHopProtocol: "http/1.1"`, `transferSize` non nul — une réponse
servie par le service worker aurait `transferSize: 0`). Avant le
correctif, le même test aurait été intercepté par le SW sans toucher le
réseau.
- [x] Build backend + frontend sans erreur.

### Pourquoi le rechargement manuel semblait "réparer" le problème
Probablement parce qu'entre-temps l'utilisateur naviguait ailleurs sur le
site (donc quittait cette URL sans route), se retrouvait malgré tout
connecté au rechargement suivant d'une page normale (le cookie avait pu
être posé par un essai antérieur, ou l'utilisateur atterrissait sur une
page qui, elle, a une route Vue valide). Dans tous les cas, ce n'était pas
fiable — certains codes d'autorisation Facebook/Google sont à usage
unique et peuvent expirer après un premier échange raté côté réseau.

---

## Coupe-circuit PWA : réglage `pwa_enabled` (admin → Paramètres)

Après les deux correctifs de cache du service worker ci-dessus, l'utilisateur
a demandé un moyen de désactiver complètement ce cache pendant qu'il
développe/teste en production (les rechargements ne reflétaient pas
toujours les derniers changements, gênant plus qu'aidant à ce stade).

### Décision
Plutôt qu'un flag codé en dur, nouveau réglage `pwa_enabled` (table
`settings`, type `BOOLEAN`, défaut `true`) modifiable depuis `/admin/parametres`
sans redéploiement — cohérent avec la règle d'or « aucune règle métier en
dur ». Contrairement aux settings existants (durées, seuils, points), c'est
le premier de type `BOOLEAN` : `AdminSettingsView.vue` a été étendu pour
afficher une case à cocher (Activé/Désactivé) au lieu d'un champ texte
quand `setting.type === 'BOOLEAN'`, les autres types gardent le champ texte
existant.

### Fait
- [x] Backend : `backend/src/settings/settings.controller.ts` (nouveau) —
      route **publique** `GET /settings/public` (`{ pwaEnabled }`), seule
      route non protégée du module Settings : le frontend doit pouvoir la
      lire dès le boot, avant toute connexion, pour décider d'enregistrer
      ou non le service worker. Enregistrée dans `SettingsModule`
      (`@Global()`, qui n'avait jusque-là aucun contrôleur).
- [x] `backend/scripts/seed.js` : entrée `pwa_enabled` ajoutée à
      `DEFAULT_SETTINGS` (idempotent, comme les autres).
- [x] Frontend : `frontend/src/services/settings.ts` (nouveau) —
      `fetchPublicSettings()`. `frontend/src/main.ts` : avant d'appeler
      `registerSW()`, on lit ce réglage — si désactivé, on désenregistre
      tout service worker déjà actif **et** on vide ses caches (débloque
      immédiatement un appareil resté sur une ancienne version, sans
      attendre une réactivation ultérieure) ; si activé, comportement
      inchangé (`registerSW` + auto-update de la session précédente).
- [x] `AdminSettingsView.vue` : case à cocher pour les settings `BOOLEAN`.
- [x] Testé de bout en bout : `GET /settings/public` (200,
      `{"pwaEnabled":true}`), bascule via `PATCH /admin/settings/pwa_enabled`
      (compte de test promu `SUPER_ADMIN` temporairement, supprimé après),
      confirmé en navigateur (build de production via `vite preview`) que
      `navigator.serviceWorker.getRegistrations()` passe bien de
      `[sw actif]` à `[]` (+ caches vidés) quand désactivé, et se
      réenregistre quand réactivé. Case à cocher confirmée visible et de
      type `checkbox` dans `/admin/parametres` (interaction de clic non
      re-testée jusqu'au bout en navigateur automatisé, outil instable
      cette session — mécanisme sous-jacent déjà validé par API).

---

## Phases suivantes

Le plan du cahier des charges (§17, Phases 0 à 11) est maintenant
entièrement construit. Les tâches restantes sont des reports explicites
documentés au fil des sections ci-dessus plutôt que des phases planifiées :

- [ ] Système de sanctions à paliers (avertissement → limitation →
      bannissement temporaire → définitif) — Phase 10.
- [ ] Ajustement automatique de `trustScore` — Phase 10.
- [ ] Création de badges configurables — Phase 9/10 (aucune logique de
      déblocage n'existe encore).
- [ ] File de statistiques avancées (carte de chaleur, villes actives) —
      §14, non demandée explicitement.
- [ ] Tests automatisés (Jest) — validation manuelle uniquement jusqu'ici.
- [ ] Migration PostgreSQL (prévue de longue date, cf. CLAUDE.md) — aucune
      fonctionnalité SQLite-spécifique utilisée à ce jour, migration reste
      possible sans réécriture.

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
4. Les Phases 0 à 11 sont terminées — le plan §17 du cahier des charges est
   entièrement construit. Il ne reste que les tâches "reportées"
   explicitement listées en section « Phases suivantes » ci-dessus
   (sanctions à paliers, trustScore automatique, badges, statistiques
   avancées, tests, migration PostgreSQL) — demander à l'utilisateur ce
   qu'il souhaite prioriser plutôt que d'enchaîner automatiquement. Pour
   toute nouvelle migration Prisma en session non interactive, voir le
   workaround documenté dans `backend/README.md` (section Base de données).
5. Pour tester en local sans repasser par l'inscription : se connecter avec
   `marc@fbc.fr` ou `admin@monstres.local` (mot de passe demandé à
   l'utilisateur si besoin), ou promouvoir un nouveau compte via
   `npm run prisma:studio` (dev) ou
   `docker compose exec backend node scripts/promote-admin.js <email>` (prod).
   L'espace admin est accessible sur `/admin` (lien « Administration »
   visible dans `/profil` pour un compte ADMIN/SUPER_ADMIN). `promote-admin.js`
   refuse volontairement `MODERATOR` (script pensé pour l'admin complet
   uniquement) — pour tester un compte MODERATOR, passer par
   `npm run prisma:studio` (dev) ou une requête SQL directe ; l'espace
   modération est alors sur `/admin/signalements` (lien « Modération »).
6. **Le projet est en production** (`https://monstres.fbc.fr`, Proxmox de
   l'utilisateur). Toute modification affectant le déploiement (nginx,
   `.env.example`, Dockerfiles) doit rester cohérente avec la config réelle
   documentée dans les sections « Correctif » ci-dessus — domaine unique,
   pas de sous-domaines api./img. pour l'instant. `.env` n'est pas
   versionné : rappeler à l'utilisateur de reporter les nouvelles valeurs à
   la main (en remplaçant, pas en dupliquant les clés — voir le bug de
   clés dupliquées ci-dessus) avant chaque `docker compose up -d --build`.
