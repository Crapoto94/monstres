# CLAUDE.md — Les Monstres

Mémoire de projet pour Claude Code. **La référence complète est
[`LES_MONSTRES_cahier_des_charges.md`](./LES_MONSTRES_cahier_des_charges.md) —
lis-le avant toute décision d'architecture ou de fonctionnalité.**

**Avant de commencer à travailler, lis aussi
[`PROGRESS.md`](./PROGRESS.md)** : état d'avancement réel, décisions prises
en session, tâches restantes. À tenir à jour à chaque session.

## Le projet en une phrase
Plateforme communautaire mobile-first pour repérer, partager et récupérer les
objets encombrants abandonnés dans la rue. Un objet abandonné = un **Monstre**.

## Règles d'or (non négociables)
1. **Vocabulaire** : « Monstre » dans l'interface, **`Item` / `items`** dans le
   code et la base. **Ne jamais écrire `monster` dans le code.**
2. **Aucune règle métier en dur.** Durées, seuils, points, limites → table
   `settings`, modifiables depuis l'admin sans déploiement.
3. **Logique métier dans des Services**, jamais dans les contrôleurs
   (`ItemService`, `ReservationService`, `ScoringService`, `NotificationService`,
   `ImageService`…).
4. **Ne jamais coupler frontend et backend.** Tout passe par l'API `/api/v1/` :
   le web n'est qu'un client, les apps mobiles viendront.
5. **Rester compatible PostgreSQL** : pas de fonctionnalité SQLite spécifique.
6. **Développement incrémental** : une phase = une version fonctionnelle +
   testée avant la suivante (plan en §17 du cahier des charges).

## Stack
- Backend : **NestJS** (dernière stable), **Node.js LTS**, **TypeScript strict**,
  **Prisma** (ORM), auth par **JWT en cookie httpOnly** (`@nestjs/passport`).
- Frontend : **Vue 3** + **TypeScript strict** + **Vite** + **Tailwind** +
  **Pinia**, en **PWA**.
- Base : **SQLite** (V1) → migration prévue **PostgreSQL** (+ PostGIS).
- Carte : **Leaflet + OpenStreetMap**. Emails : **Brevo**.
- Déploiement : **Docker Compose** derrière **NGINX**, sur serveur **Proxmox**.
  **Développement local sans Docker** (Node/npm en direct) — Docker n'est
  utilisé que pour le déploiement sur le Proxmox.

## Conventions
- Backend : ESLint + Prettier, DTO + `class-validator` (équivalent Form
  Requests), Guards (équivalent Policies), Services, Modules Nest.
- Frontend : composants réutilisables, Composition API, stores Pinia.
- API : réponses JSON standardisées `{ success, data, message }` /
  `{ success, error: { code, message } }`.
- Chaque module : README + doc API + commentaires utiles.
- **Versioning** : à **chaque `git push` sur `master`**, incrémenter la
  version (patch, ex. `0.1.1` → `0.1.2`) dans **les deux**
  `backend/package.json` et `frontend/package.json` (synchronisés, un seul
  numéro pour l'appli). La version est affichée sur l'accueil
  (`HomeView.vue`, via `__APP_VERSION__` injecté par Vite au build) et dans
  `GET /api/v1/health` côté backend — c'est ce qui permet de vérifier ce qui
  est réellement déployé en prod. Ne pas oublier ce bump avant de committer.

## Domaine & sous-domaines (racine `fbc.fr`)
| Sous-domaine | Rôle |
|---|---|
| `monstres.fbc.fr` | Frontend PWA |
| `api.monstres.fbc.fr` | API NestJS |
| `img.monstres.fbc.fr` | Photos (recommandé) |
| `staging.monstres.fbc.fr` / `api.staging.monstres.fbc.fr` | Pré-production |
| `admin.monstres.fbc.fr` | Admin (ou route `/admin`) |

Auth SPA cookie-based : cookie JWT httpOnly `Domain=.monstres.fbc.fr`,
`SameSite=Lax`, `Secure` en production. Les futures apps mobiles utiliseront
le même JWT en `Authorization: Bearer`.

## Où commencer
Phase 0 du cahier des charges : dépôt Git, environnement de dev local (sans
Docker), NestJS + Prisma + Vue + Tailwind + TypeScript + SQLite, avec
`docker-compose.yml` (prêt pour le déploiement Proxmox), `.env.example`,
`README.md`. Critère de validation local : `npm run start:dev` (backend) et
`npm run dev` (frontend) démarrent tous les deux sans erreur.

## À ne jamais faire
- Créer de la dette technique inutile.
- Mélanger frontend et backend.
- Coder des règles métier en dur.
- Supprimer une possibilité d'évolution pour aller plus vite.
