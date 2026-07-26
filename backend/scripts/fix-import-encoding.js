// Corrige l'encodage UTF-8 corrompu (accents -> �) sur des Monstres importés
// via /import/facebook, causé par un passage de champs accentués en argument
// curl inline (au lieu d'un fichier UTF-8) lors d'un import manuel.
//
// Usage : node scripts/fix-import-encoding.js
// Prod (Docker)  : docker compose exec backend node scripts/fix-import-encoding.js
require('dotenv/config');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('../dist/generated/prisma/client');

const FIXES = [
  {
    id: '23a8c8a9-d6e9-4481-bbe8-2b8cc5eb497d',
    title: 'Maison de poupée en bois',
    description:
      'Grande maison de poupée en bois (3 étages, avec escalier et mobilier), laissée sur le trottoir.',
  },
  {
    id: 'b2823910-d17c-4d4b-b83e-27907c68373c',
    title: 'Commode ancienne + siège auto',
    description:
      "Commode secrétaire ancienne en bois avec pupitre à abattant, ainsi qu'un siège auto, laissés sur le trottoir.",
  },
];

async function main() {
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  for (const fix of FIXES) {
    const item = await prisma.item
      .update({
        where: { id: fix.id },
        data: { title: fix.title, description: fix.description },
      })
      .catch(() => null);
    console.log(item ? `${fix.id} -> "${item.title}"` : `${fix.id} introuvable, ignoré.`);
  }

  await prisma.$disconnect();
}

main();
