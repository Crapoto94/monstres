// Crée (ou met à jour) le compte robot sous lequel les Monstres importés
// automatiquement (ex. groupe Facebook) sont publiés en PENDING_REVIEW.
//
// Usage : npm run build && node scripts/create-import-bot.js
// L'email est lu depuis IMPORT_BOT_EMAIL (.env), défaut import-bot@monstres.local.
//
// Le compte a un mot de passe aléatoire inutilisable (il ne se connecte
// jamais via le formulaire : l'import passe par l'endpoint token, pas par un
// login). Email marqué vérifié pour cohérence.
require('dotenv/config');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('../dist/generated/prisma/client');

async function main() {
  const email = process.env.IMPORT_BOT_EMAIL || 'import-bot@monstres.local';
  const name = process.env.IMPORT_BOT_NAME || 'Les Monstres (import Facebook)';

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, emailVerifiedAt: new Date() },
    create: {
      email,
      name,
      password: randomPassword,
      emailVerifiedAt: new Date(),
      // Pas de notifications email pour un compte robot.
      emailNotifications: false,
    },
    select: { id: true, email: true, name: true },
  });

  console.log(`Compte robot d'import prêt : ${user.name} <${user.email}> (id ${user.id}).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
