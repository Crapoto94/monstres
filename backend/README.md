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
npm run start:dev        # démarre l'API sur http://localhost:3000
```

Vérification : `GET http://localhost:3000/api/v1/health` doit répondre
`{ "success": true, "data": { "status": "ok", "database": "connected" }, "message": "" }`.

## Structure
```
src/
  app.module.ts        Module racine (Config, Throttler, Schedule, EventEmitter, Prisma)
  main.ts               Bootstrap : préfixe /api/v1, CORS, cookies, ValidationPipe
  prisma/                PrismaService (client Prisma + adaptateur libsql)
  health/                Endpoint de vérification /api/v1/health
  common/
    filters/             HttpExceptionFilter → { success: false, error: { code, message } }
    interceptors/        ResponseInterceptor → { success: true, data, message }
prisma/
  schema.prisma          Modèle de données (voir §13 du cahier des charges)
  migrations/
```

Chaque futur module métier (auth, items, reservations, reports…) suit le
même schéma : `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`,
`guards/`. **La logique métier vit exclusivement dans les Services, jamais
dans les contrôleurs.**

## Base de données
SQLite en V1 via l'adaptateur Prisma `@prisma/adapter-libsql` (pas de
compilation native requise, contrairement à `better-sqlite3`). Migration
prévue vers PostgreSQL — ne jamais utiliser de fonctionnalité SQLite
spécifique dans le schéma ou les requêtes.

```bash
npm run prisma:migrate    # créer/appliquer une migration
npm run prisma:generate   # régénérer le client après modif du schéma
npm run prisma:studio     # explorer les données
```

## Tests
```bash
npm test        # unitaires
npm run test:e2e
```
