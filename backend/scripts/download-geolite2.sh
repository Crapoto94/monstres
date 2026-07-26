#!/bin/sh
# Télécharge/actualise la base MaxMind GeoLite2-City utilisée par les
# statistiques de consultation (§ KPI admin, GeoIpService). Optionnelle :
# sans cette base, la localisation des visiteurs reste vide, le reste des
# statistiques (vues, OS, navigateur, appareil) fonctionne normalement.
#
# Écrit en /bin/sh POSIX (pas bash) : l'image Docker du backend est basée
# sur node:22-alpine, qui n'embarque pas bash.
#
# 1. Créer un compte gratuit sur https://www.maxmind.com/en/geolite2/signup
# 2. Générer une clé de licence : My Account → Manage License Keys
# 3. Lancer :
#    Dev local     : MAXMIND_LICENSE_KEY='...' sh scripts/download-geolite2.sh
#    Prod (Docker) : docker compose exec backend sh -c \
#                      "MAXMIND_LICENSE_KEY='...' sh scripts/download-geolite2.sh"
#                    (écrit dans /app/data, déjà un volume persistant —
#                    voir docker-compose.yml). À refaire périodiquement,
#                    MaxMind publiant des mises à jour régulières.
set -eu

if [ -z "${MAXMIND_LICENSE_KEY:-}" ]; then
  echo "Erreur : définis MAXMIND_LICENSE_KEY avant de lancer ce script." >&2
  echo "  MAXMIND_LICENSE_KEY='...' sh scripts/download-geolite2.sh" >&2
  exit 1
fi

DOWNLOAD_URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"
DATA_DIR="$(dirname "$0")/../data"
mkdir -p "$DATA_DIR"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "== Téléchargement de GeoLite2-City =="
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP/geolite2-city.tar.gz"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$DOWNLOAD_URL" -O "$TMP/geolite2-city.tar.gz"
else
  echo "Erreur : ni curl ni wget ne sont installés dans ce conteneur." >&2
  echo "  Alternative : télécharge la base depuis une machine qui a curl," >&2
  echo "  puis copie-la avec : docker compose cp GeoLite2-City.mmdb backend:/app/data/" >&2
  exit 1
fi

tar -xzf "$TMP/geolite2-city.tar.gz" -C "$TMP"

MMDB_FILE=$(find "$TMP" -name "*.mmdb" | head -n 1)
if [ -z "$MMDB_FILE" ]; then
  echo "Erreur : aucun fichier .mmdb trouvé dans l'archive téléchargée." >&2
  exit 1
fi

cp "$MMDB_FILE" "$DATA_DIR/GeoLite2-City.mmdb"
echo "Base installée : $DATA_DIR/GeoLite2-City.mmdb"
