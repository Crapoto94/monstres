#!/bin/sh
# Réinitialise le mot de passe d'un utilisateur.
# Usage : docker compose exec -w /app backend sh scripts/reset-password.sh <email> <mot_de_passe>

EMAIL="$1"
PASSWORD="$2"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: docker compose exec -w /app backend sh scripts/reset-password.sh <email> <mot_de_passe>"
  exit 1
fi

node -e "
const Database = require('libsql');
const bcrypt = require('bcrypt');
const db = new Database('/app/data/monstres.db');
const hash = bcrypt.hashSync('$PASSWORD', 10);
const stmt = db.prepare('UPDATE users SET password = ? WHERE email = ?');
const result = stmt.run(hash, '$EMAIL');
db.close();
if (result.changes > 0) {
  console.log('✅ Mot de passe mis a jour pour $EMAIL');
} else {
  console.error('❌ Aucun utilisateur trouve avec l email $EMAIL');
  process.exit(1);
}
"
