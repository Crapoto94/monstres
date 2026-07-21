// Seed des données de référence par défaut : paramètres administrables
// (§12.10 + TTL des tokens d'auth de la Phase 1) et catégories initiales
// (§6.7). Idempotent : n'écrase pas une valeur déjà modifiée depuis l'admin.
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
  // Poids du score de classement (§8) — decision de session, non chiffrés
  // dans le cahier des charges. Somme = 1. Distance dominante par défaut
  // ("priorité de tri par défaut : distance → popularité → date"), les
  // autres facteurs peuvent la faire remonter (ex. Monstre populaire à 3km
  // devant un Monstre banal à 100m).
  { key: 'ranking_weight_distance', value: '0.5', type: 'FLOAT' },
  { key: 'ranking_weight_popularity', value: '0.25', type: 'FLOAT' },
  { key: 'ranking_weight_recency', value: '0.15', type: 'FLOAT' },
  { key: 'ranking_weight_trust', value: '0.1', type: 'FLOAT' },
];

const DEFAULT_CATEGORIES = [
  { name: 'Meuble', icon: 'sofa', order: 1 },
  { name: 'Électroménager', icon: 'plug', order: 2 },
  { name: 'Jardin', icon: 'tree', order: 3 },
  { name: 'Bricolage', icon: 'hammer', order: 4 },
  { name: 'Métal', icon: 'wrench', order: 5 },
  { name: 'Bois', icon: 'tree-deciduous', order: 6 },
  { name: 'Vélo', icon: 'bike', order: 7 },
  { name: 'Décoration', icon: 'lamp', order: 8 },
  { name: 'Autre', icon: 'box', order: 9 },
];

async function main() {
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  for (const setting of DEFAULT_SETTINGS) {
    const existing = await prisma.setting.findUnique({ where: { key: setting.key } });
    if (!existing) {
      await prisma.setting.create({ data: setting });
      console.log(`+ setting ${setting.key} = ${setting.value}`);
    }
  }

  for (const category of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { name: category.name } });
    if (!existing) {
      await prisma.category.create({ data: { ...category, active: true } });
      console.log(`+ catégorie ${category.name}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
