# Les Monstres

Plateforme communautaire mobile-first pour repérer, partager et récupérer
les objets encombrants abandonnés dans la rue. Un objet abandonné = un
**Monstre**.

- Référence fonctionnelle et technique complète :
  [`LES_MONSTRES_cahier_des_charges.md`](./LES_MONSTRES_cahier_des_charges.md)
- Règles non négociables pour tout développement (IA ou humain) :
  [`CLAUDE.md`](./CLAUDE.md)
- État d'avancement réel et tâches restantes :
  [`PROGRESS.md`](./PROGRESS.md)

## Stack
| Couche | Techno |
|---|---|
| Backend | NestJS + TypeScript strict + Prisma |
| Frontend | Vue 3 + TypeScript strict + Vite + Tailwind + Pinia (PWA) |
| Base | SQLite (V1) → PostgreSQL prévu |
| Carte | Leaflet + OpenStreetMap |
| Emails | Brevo |
| Déploiement | Docker Compose + NGINX, sur serveur Proxmox |

## Structure du dépôt
```
backend/     API NestJS + Prisma       → backend/README.md
frontend/    PWA Vue 3                 → frontend/README.md
nginx/       Reverse proxy (déploiement Proxmox uniquement)
storage/     Service de photos statiques (déploiement uniquement)
docker-compose.yml   Déploiement uniquement — pas utilisé en local
```

## Développement local (sans Docker)

Le développement se fait **sans Docker** : PHP/Docker ne sont pas requis,
seuls Node.js et npm suffisent. Docker Compose ne sert qu'au déploiement sur
le serveur Proxmox de production.

Terminal 1 — backend :
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run start:dev        # http://localhost:3000
```

Terminal 2 — frontend :
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:5173
```

Une fois `npm install` fait une première fois dans chaque dossier, le script
[`dev.bat`](./dev.bat) (Windows) lance les deux serveurs en une commande,
chacun dans sa propre fenêtre :
```bat
dev.bat
```

Vérification : [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
doit répondre `{ "success": true, "data": { "status": "ok", "database": "connected" } }`,
et [http://localhost:5173](http://localhost:5173) doit afficher l'application
avec sa barre de navigation basse (Accueil / Carte / Ajouter / Alertes / Profil).

## Déploiement (Proxmox, avec Docker)

```bash
cp .env.example .env   # renseigner les secrets et l'URL de production
docker compose up -d --build
```

Voir §12.2 du cahier des charges pour le détail des sous-domaines
(`monstres.fbc.fr`, `api.monstres.fbc.fr`, `img.monstres.fbc.fr`) et la
configuration DNS/Brevo. **TLS n'est pas géré par `nginx/nginx.conf`** — à
terminer en amont (certbot ou reverse proxy déjà présent sur le Proxmox)
avant toute mise en production.

### Mettre à jour un déploiement existant
```bash
git pull
docker compose up -d --build
```
Rebuild les images modifiées et redémarre les conteneurs ; les migrations
Prisma s'appliquent automatiquement au démarrage du backend (voir
`backend/Dockerfile`). Si le build semble utiliser un vieux cache après un
correctif (fichier modifié mais erreur qui persiste), forcer avec
`docker compose build --no-cache` puis `docker compose up -d`.

**Premier déploiement uniquement** — les catégories et paramètres par
défaut (§6.7, §12.10) ne sont pas seedés automatiquement au démarrage :
```bash
docker compose exec backend node scripts/seed.js
```
Sans ça, `GET /categories` renverra une liste vide (rien de cassé, juste
vide) tant que ce n'est pas lancé une fois.

## Méthode de développement

Le projet avance **par phases incrémentales** (§17 du cahier des charges) :
chaque phase produit une version fonctionnelle et testée avant de passer à
la suivante. Voir [`PROGRESS.md`](./PROGRESS.md) pour la phase en cours et
le détail de ce qui reste à faire.
