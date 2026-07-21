# Suivi de développement — Les Monstres

> Fichier de reprise de contexte. À lire par toute IA/dev qui reprend le
> projet. Mettre à jour ce fichier à chaque session (cocher les cases,
> ajouter des décisions, déplacer les tâches terminées).
>
> Référence fonctionnelle complète : [`LES_MONSTRES_cahier_des_charges.md`](./LES_MONSTRES_cahier_des_charges.md)
> Règles non négociables : [`CLAUDE.md`](./CLAUDE.md)

Dernière mise à jour : **2026-07-21**

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
- [ ] **Commit Git du backend** (`backend/` est actuellement untracked —
      `git add backend && git commit`). À faire dès que le scaffold backend
      est jugé stable.
- [ ] **Scaffolder le frontend** : Vue 3 + TypeScript strict + Vite +
      Tailwind + Pinia, en PWA, dans `frontend/`. Structure attendue :
      `src/components`, `views`, `stores`, `services`, `router`, `assets`.
      Rien n'existe encore pour le frontend à ce stade.
- [ ] **`docker-compose.yml`** à la racine (services `nginx`, `frontend`,
      `backend`, `storage` — pour le déploiement Proxmox uniquement, voir
      §12.2). Pas encore écrit.
- [ ] **`.env.example` racine** regroupant les variables de déploiement
      (domaines, secrets partagés) — distinct des `.env.example` propres à
      chaque app. Pas encore écrit.
- [ ] **`README.md` racine** : vue d'ensemble du monorepo, instructions de
      démarrage local (backend + frontend, sans Docker) et de déploiement
      (avec Docker sur Proxmox). Pas encore écrit.
- [ ] **Validation finale Phase 0** : lancer backend (`npm run start:dev`)
      ET frontend (`npm run dev`) simultanément, vérifier absence d'erreur.

---

## Phases suivantes (non commencées)

Voir §17 du cahier des charges pour le détail complet de chaque phase. Ordre
et contenu résumé :

- [ ] **Phase 1 — Authentification.** Inscription email + validation email,
      connexion/déconnexion, mot de passe oublié, profil. Implémente le JWT
      cookie httpOnly décrit dans les décisions ci-dessus (module `auth` +
      `users` NestJS, tables `users`/`social_accounts` déjà présentes dans
      le schéma Prisma). Pages frontend `/login`, `/register`, `/profile`.
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
3. Vérifier que le backend démarre toujours : dans `backend/`,
   `npm install` puis `npm run start:dev`, tester
   `GET http://localhost:3000/api/v1/health`.
4. Continuer sur la première case non cochée de la section « Restant à faire
   — Phase 0 », puis enchaîner les phases dans l'ordre.
