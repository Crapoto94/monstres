# Backend — NestJS + Prisma
# Utilisé uniquement pour le déploiement (Docker Compose / Proxmox).
# En développement local, pas de Docker : `npm run start:dev`.

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

EXPOSE 3000

# Applique les migrations puis démarre l'API. Le fichier SQLite (V1) et le
# dossier de stockage des photos vivent dans des volumes montés (voir
# docker-compose.yml : /app/data et /app/storage).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
