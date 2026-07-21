# Suivi de développement — Les Monstres

> Fichier de reprise de contexte. À lire par toute IA/dev qui reprend le
> projet. Mettre à jour ce fichier à chaque session (cocher les cases,
> ajouter des décisions, déplacer les tâches terminées).
>
> Référence fonctionnelle complète : [`LES_MONSTRES_cahier_des_charges.md`](./LES_MONSTRES_cahier_des_charges.md)
> Règles non négociables : [`CLAUDE.md`](./CLAUDE.md)

Dernière mise à jour : **2026-07-21**

**Statut : Phases 0 (Initialisation) et 1 (Authentification) terminées et
validées.** Prochaine étape : **Phase 2 — Création des Monstres** (voir
détail plus bas).

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

## Phases suivantes (non commencées)

Voir §17 du cahier des charges pour le détail complet de chaque phase. Ordre
et contenu résumé :

- [ ] **Phase 2 — Création des Monstres.** Formulaire 4 étapes (photo →
      position → infos → publication). Module `items` (`ImageService` pour
      upload/compression/miniature/EXIF). Tables `items`/`item_photos`/
      `categories` déjà présentes dans le schéma.
- [ ] **Phase 3 — Consultation.** Liste triée (distance → popularité →
      date), carte Leaflet optionnelle. Algorithme de classement calculé à
      la volée (§8).
- [ ] **Phase 4 — Réservation.** `ReservationService`, job planifié
      (`@nestjs/schedule`, toutes les minutes) pour expirer les réservations
      `RESERVED → AVAILABLE`.
- [ ] **Phase 5 — Validation de récupération.** Photo « lieu vide »,
      `RESERVED → COLLECTED`.
- [ ] **Phase 6 — Communautaire.** `votes` (type unique `interesting`),
      `comments`, `ScoringService` + `scoring_events`.
- [ ] **Phase 7 — Notifications.** Email uniquement via Brevo,
      `NotificationService`, table `notifications`.
- [ ] **Phase 8 — Abonnements géographiques.** Table `subscriptions`
      (max 5 lieux, rayon max 5 km — valeurs dans `settings`, pas en dur).
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
4. Les Phases 0 et 1 sont terminées. Continuer sur la première case non
   cochée de **Phase 2 — Création des Monstres** (section « Phases
   suivantes » ci-dessus), puis enchaîner dans l'ordre. Ne pas paralléliser
   plusieurs phases à la fois (§0). Pour toute nouvelle migration Prisma en
   session non interactive, voir le workaround documenté dans
   `backend/README.md` (section Base de données).
