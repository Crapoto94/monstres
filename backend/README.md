# Les Monstres — Backend (API)

API NestJS + TypeScript + Prisma. Référence fonctionnelle complète :
[`../LES_MONSTRES_cahier_des_charges.md`](../LES_MONSTRES_cahier_des_charges.md).
Conventions du projet : [`../CLAUDE.md`](../CLAUDE.md).

## Prérequis
- Node.js LTS + npm
- Pas de Docker en développement local (réservé au déploiement Proxmox)

## Démarrage local

```bash
npm install
cp .env.example .env
npm run prisma:migrate   # applique les migrations sur SQLite local
npm run prisma:seed      # paramètres par défaut (durées, seuils, points…)
npm run start:dev        # démarre l'API sur http://localhost:3000
```

Vérification : `GET http://localhost:3000/api/v1/health` doit répondre
`{ "success": true, "data": { "status": "ok", "database": "connected" }, "message": "" }`.

## Structure
```
src/
  app.module.ts        Module racine
  main.ts               Bootstrap : préfixe /api/v1, CORS, cookies, ValidationPipe
  prisma/                PrismaService (client Prisma + adaptateur libsql)
  settings/              SettingsService : lecture/écriture de la table `settings`
                          (durées, seuils, points — jamais en dur, voir CLAUDE.md)
  email/                 EmailService (Brevo) — voir section Emails plus bas
  auth/                  Inscription, connexion, JWT cookie httpOnly (Phase 1)
  users/                 Profil public (GET /users/:id)
  admin/                 Espace admin (Phase 9) : dashboard, utilisateurs, Monstres,
                          catégories, paramètres — réservé ADMIN/SUPER_ADMIN
  health/                Endpoint de vérification /api/v1/health
  common/
    filters/             HttpExceptionFilter → { success: false, error: { code, message } }
    interceptors/        ResponseInterceptor → { success: true, data, message }
prisma/
  schema.prisma          Modèle de données (voir §13 du cahier des charges)
  migrations/
scripts/
  seed.js                 Seed des paramètres par défaut (tourne contre dist/, voir plus bas)
```

Chaque module métier suit le même schéma : `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `dto/`, `guards/`. **La logique métier vit exclusivement
dans les Services, jamais dans les contrôleurs.**

## Authentification (Phase 1)
JWT signé, transporté en cookie **httpOnly** (`access_token` par défaut,
voir `JWT_COOKIE_NAME`). Routes :

```
POST /api/v1/auth/register          POST /api/v1/auth/login
POST /api/v1/auth/logout            GET  /api/v1/auth/me            (protégé)
GET  /api/v1/auth/verify-email?token=...
POST /api/v1/auth/forgot-password   POST /api/v1/auth/reset-password
GET  /api/v1/users/:id              (profil public)
```

Google/Facebook Login (§10) : pas encore implémentés, en attente des
identifiants OAuth — voir `PROGRESS.md`.

### Devenir admin
Le compte doit déjà exister (inscription via `/inscription`) — ces méthodes
changent seulement le rôle.

**En dev local** : `npm run prisma:studio`, ouvrir la table `users`,
changer la colonne `role`.

**En production (Docker)** :
```bash
docker compose exec backend node scripts/promote-admin.js ton-email@example.com
```
(deuxième argument optionnel : `SUPER_ADMIN` au lieu du défaut `ADMIN`.)

Dans les deux cas, **reconnecte-toi** ensuite dans l'app — le rôle est
embarqué dans le cookie JWT à la connexion, une modification en base seule
ne suffit pas.

### Espace admin (Phase 9)
Une fois connecté avec un compte `ADMIN`/`SUPER_ADMIN`, l'espace est
accessible sur `/admin` (lien « Administration » dans `/profil`). Endpoints
(tous sous `/api/v1/admin/`, gardés par `RolesGuard`) :

```
GET  /admin/dashboard                     Compteurs (utilisateurs, Monstres par statut, taux de récupération)

GET  /admin/users                         Liste paginée (?search=, ?page=)
GET  /admin/users/:id                     Détail + stats
PATCH /admin/users/:id/verify-email       Valide manuellement l'email
PATCH /admin/users/:id/role               Change le rôle (ADMIN/SUPER_ADMIN réservé SUPER_ADMIN)
PATCH /admin/users/:id/suspend|unsuspend  Suspension temporaire (bloque la connexion)
PATCH /admin/users/:id/ban|unban          Bannissement (bloque la connexion)
DELETE /admin/users/:id                   Suppression définitive (réservé SUPER_ADMIN)

GET  /admin/items                         Recherche multi-critères paginée (?search=, ?status=, ?categoryId=)
GET  /admin/items/:id                     Détail
PATCH /admin/items/:id/status             Change le statut (masquer = HIDDEN)
DELETE /admin/items/:id                   Suppression définitive + nettoyage des photos sur disque

GET/POST /admin/categories                Liste (actives + inactives) / création
PATCH/DELETE /admin/categories/:id        Modification / suppression (refusée si Monstres liés)

GET  /admin/settings                      Liste tous les paramètres
PATCH /admin/settings/:key                Modifie une valeur (le type est préservé si non précisé)
```

Un admin ne peut pas s'auto-modérer (suspendre/bannir/supprimer/changer son
propre rôle), et seul un `SUPER_ADMIN` peut modérer un compte
`ADMIN`/`SUPER_ADMIN` ou en supprimer un — voir `AdminUsersService.assertCanModerate`.

## Emails (Brevo)
`EmailService` envoie via l'API Brevo (validation d'email, mot de passe
oublié). **Sans `BREVO_API_KEY` configurée, les emails sont simplement
loggés en console** (niveau `warn`, avec le lien complet) — pratique en dev
local sans compte Brevo. Pour de vrais envois :
1. Créer une clé API sur [app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api).
2. Renseigner `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` dans `.env`.
3. En production, configurer SPF/DKIM/DMARC sur le domaine d'envoi (§12.2 du cahier des charges).

## Base de données
SQLite en V1 via l'adaptateur Prisma `@prisma/adapter-libsql` (pas de
compilation native requise, contrairement à `better-sqlite3`). Migration
prévue vers PostgreSQL — ne jamais utiliser de fonctionnalité SQLite
spécifique dans le schéma ou les requêtes.

```bash
npm run prisma:migrate    # créer/appliquer une migration (terminal interactif)
npm run prisma:generate   # régénérer le client après modif du schéma
npm run prisma:seed       # (ré)appliquer les paramètres par défaut
npm run prisma:studio     # explorer les données
```

> Dans un terminal **non interactif** (script CI, agent automatisé),
> `prisma migrate dev` refuse de s'exécuter dès qu'il détecte un changement
> non trivial. Solution : générer le SQL avec
> `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`,
> l'écrire à la main dans `prisma/migrations/<horodatage>_<nom>/migration.sql`,
> puis appliquer avec `npx prisma migrate deploy` (non interactif).

## Tests
```bash
npm test        # unitaires
npm run test:e2e
```
