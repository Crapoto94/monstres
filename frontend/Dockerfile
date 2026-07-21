# Frontend — Vue 3 PWA, buildée puis servie en statique par nginx.
# Utilisé uniquement pour le déploiement (Docker Compose / Proxmox).
# En développement local, pas de Docker : `npm run dev`.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
