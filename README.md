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

**Domaine unique en V1** : seul `monstres.fbc.fr` doit être configuré en DNS
et dans le reverse-proxy externe qui gère le HTTPS (celui qui termine déjà
le TLS pour `monstres.fbc.fr`, pas `nginx/nginx.conf` qui ne fait que du
HTTP interne). L'API est exposée sur `/api/` et les photos sur `/uploads/`
du même domaine — pas besoin de `api.monstres.fbc.fr` ni
`img.monstres.fbc.fr` pour l'instant (voir PROGRESS.md pour le détail et
comment revenir aux sous-domaines plus tard si besoin). Voir §12.2 du
cahier des charges pour l'architecture complète à sous-domaines et la
configuration DNS/Brevo.

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

⚠️ **`.env` n'est pas versionné** : un `git pull` ne met jamais à jour tes
valeurs existantes. Si `.env.example` change (ex. passage aux URLs sur
domaine unique), reporte les nouvelles valeurs à la main dans ton `.env`
avant de relancer `docker compose up -d --build` — sinon l'ancienne
configuration (baked au build pour `VITE_API_URL`) continue d'être utilisée.

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
