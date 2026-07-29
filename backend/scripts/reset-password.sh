#!/bin/sh
# Crée ou réinitialise un compte admin.
# Usage : docker compose exec -w /app backend sh scripts/reset-password.sh <email> [mot_de_passe]

EMAIL="$1"
PASSWORD="${2:-admin123}"

if [ -z "$EMAIL" ]; then
  echo "Usage: docker compose exec -w /app backend sh scripts/reset-password.sh <email> [mot_de_passe]"
  exit 1
fi

node -e "
const Database = require('libsql');
const bcrypt = require('bcrypt');
const db = new Database('/app/data/monstres.db');

const hash = bcrypt.hashSync('$PASSWORD', 10);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('$EMAIL');

if (existing) {
  db.prepare('UPDATE users SET password = ?, bannedAt = NULL, suspendedAt = NULL, role = ? WHERE email = ?').run(hash, 'SUPER_ADMIN', '$EMAIL');
  console.log('✅ Mot de passe mis a jour pour ' + '$EMAIL');
} else {
  const id = require('crypto').randomUUID();
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(id, '$EMAIL', '$EMAIL', hash, 'SUPER_ADMIN');
  console.log('✅ Compte cree : ' + '$EMAIL' + ' (SUPER_ADMIN)');
}

db.close();
"
