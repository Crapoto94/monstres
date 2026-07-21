// Promeut un compte existant en ADMIN (ou SUPER_ADMIN). Utile en prod où
// npm run prisma:studio n'est pas directement accessible.
//
// Usage : node scripts/promote-admin.js <email> [ADMIN|SUPER_ADMIN]
// Prod (Docker)  : docker compose exec backend node scripts/promote-admin.js <email>
// Dev local      : npm run build && node scripts/promote-admin.js <email>
//
// Le compte doit déjà exister (inscription via /inscription) — ce script ne
// crée pas de compte, il change seulement le rôle.
require('dotenv/config');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('../dist/generated/prisma/client');

async function main() {
  const email = process.argv[2];
  const role = process.argv[3] || 'ADMIN';

  if (!email) {
    console.error('Usage: node scripts/promote-admin.js <email> [ADMIN|SUPER_ADMIN]');
    process.exit(1);
  }
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    console.error('Le rôle doit être ADMIN ou SUPER_ADMIN.');
    process.exit(1);
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user
    .update({ where: { email }, data: { role } })
    .catch(() => null);

  if (!user) {
    console.error(`Aucun compte avec l'email ${email}. Inscris-toi d'abord sur /inscription.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`${user.email} est maintenant ${user.role}.`);
  console.log('Déconnecte-toi puis reconnecte-toi dans l\'app pour que le nouveau rôle soit pris en compte (le rôle est embarqué dans le cookie JWT à la connexion).');
  await prisma.$disconnect();
}

main();
