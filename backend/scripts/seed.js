// Seed des paramètres administrables par défaut (§12.10 du cahier des
// charges + TTL des tokens d'auth de la Phase 1). Idempotent : n'écrase pas
// une valeur déjà modifiée depuis l'admin.
//
// Tourne contre le build compilé (dist/) — pas de ts-node : le client Prisma
// généré utilise des specifiers ".js" que seul un vrai fichier compilé
// résout correctement. `npm run prisma:seed` build automatiquement avant.
require('dotenv/config');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('../dist/generated/prisma/client');

const DEFAULT_SETTINGS = [
  { key: 'reservation_duration_minutes', value: '60', type: 'INTEGER' },
  { key: 'max_photos_per_item', value: '3', type: 'INTEGER' },
  { key: 'max_user_subscriptions', value: '5', type: 'INTEGER' },
  { key: 'max_subscription_radius', value: '5000', type: 'INTEGER' },
  { key: 'report_threshold', value: '3', type: 'INTEGER' },
  { key: 'already_collected_threshold', value: '3', type: 'INTEGER' },
  { key: 'points_creation', value: '5', type: 'INTEGER' },
  { key: 'points_recuperation', value: '10', type: 'INTEGER' },
  { key: 'points_validation', value: '5', type: 'INTEGER' },
  { key: 'points_vote_utile', value: '1', type: 'INTEGER' },
  { key: 'email_verification_token_ttl_hours', value: '24', type: 'INTEGER' },
  { key: 'password_reset_token_ttl_minutes', value: '60', type: 'INTEGER' },
];

async function main() {
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  for (const setting of DEFAULT_SETTINGS) {
    const existing = await prisma.setting.findUnique({ where: { key: setting.key } });
    if (!existing) {
      await prisma.setting.create({ data: setting });
      console.log(`+ ${setting.key} = ${setting.value}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
