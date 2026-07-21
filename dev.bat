@echo off
REM Lance le backend (NestJS) et le frontend (Vite) en developpement local,
REM chacun dans sa propre fenetre. Pas de Docker (reserve au deploiement).

set ROOT=%~dp0

echo Demarrage du backend sur http://localhost:3000 ...
start "Les Monstres - Backend" cmd /k "cd /d "%ROOT%backend" && npm run start:dev"

echo Demarrage du frontend sur http://localhost:5173 ...
start "Les Monstres - Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"
