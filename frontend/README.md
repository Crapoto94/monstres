# Les Monstres — Frontend (PWA)

Vue 3 (Composition API) + TypeScript strict + Vite + Tailwind CSS + Pinia,
en PWA. Référence fonctionnelle complète :
[`../LES_MONSTRES_cahier_des_charges.md`](../LES_MONSTRES_cahier_des_charges.md).
Conventions du projet : [`../CLAUDE.md`](../CLAUDE.md).

## Prérequis
- Node.js LTS + npm
- Pas de Docker en développement local (réservé au déploiement Proxmox)
- Le backend (`../backend`) doit tourner sur `http://localhost:3000` pour
  que les appels API fonctionnent.

## Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev   # http://localhost:5173
```

## Structure
```
src/
  main.ts               Bootstrap : Pinia + Vue Router
  App.vue                 Layout racine (mobile-first, largeur max, nav basse)
  router/                 Routes : /, /carte, /ajouter, /alertes, /profil
  stores/                 Stores Pinia (auth.ts en placeholder Phase 1)
  services/               Client API (axios, préfixe /api/v1, cookies credentials)
  components/
    layout/                Composants de layout (BottomNav)
  views/                   Une vue par route (Home, Map, AddItem, Alerts, Profile)
```

Navigation principale — barre basse (§4 du cahier des charges) :
`Accueil | Carte | Ajouter | Alertes | Profil`.

Les vues sont actuellement des placeholders : chaque écran indique la phase
du plan de développement (§17) qui l'implémentera.

## PWA
Configurée via `vite-plugin-pwa` (`vite.config.ts`) : manifest, service
worker, installable. **Icônes actuelles = placeholder SVG** — à remplacer par
de vraies icônes PNG (192×192, 512×512, maskable) lors du travail de
branding.

## Variables d'environnement
`VITE_API_URL` — URL de base de l'API (défaut `http://localhost:3000/api/v1`).

## Tests
Pas encore mis en place (prévu à partir de la Phase 1 — navigation,
formulaires, responsive, voir §16 du cahier des charges).
