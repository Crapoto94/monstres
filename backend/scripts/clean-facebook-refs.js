// Nettoie les références au groupe Facebook laissées par la routine d'import
// (scripts/create-import-bot.js) dans les Monstres importés : remplace la
// mention "Posté dans le groupe indépendant Facebook « Les Monstres »"
// (et variantes) par un simple "Vu sur Facebook" SANS lien, et supprime tout
// lien facebook.com résiduel — sur TOUS les Monstres (pas seulement les
// archivés), items comme commentaires.
//
// Portée volontairement limitée aux items/commentaires du compte robot
// (IMPORT_BOT_EMAIL) : seul ce compte poste ce type de texte, ça évite tout
// risque de toucher du contenu écrit par de vrais utilisateurs.
//
// Usage :
//   node scripts/clean-facebook-refs.js scan     (défaut, aucune écriture — affiche le diff)
//   node scripts/clean-facebook-refs.js apply    (applique les changements listés par "scan")
//
// Prod (Docker)  : docker compose exec backend node scripts/clean-facebook-refs.js scan
//                   docker compose exec backend node scripts/clean-facebook-refs.js apply
// Dev local      : npm run build && node scripts/clean-facebook-refs.js scan
//
// Avant "apply" en prod : fais d'abord une sauvegarde complète (Admin →
// Sauvegardes, ou `docker compose exec backend` équivalent) — "apply" écrit
// aussi un fichier JSON d'audit (avant/après) dans backend/backups/, mais une
// vraie sauvegarde base entière reste la meilleure protection.
require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('../dist/generated/prisma/client');

const REPLACEMENT = 'Vu sur Facebook';

// Tout lien facebook.com est retiré en premier — avant de repérer la phrase
// d'attribution, pour que les points (fbid=1&set=pcb.2) qu'il contient ne
// soient pas pris pour une fin de phrase.
const FB_LINK_RE = /https?:\/\/(www\.)?facebook\.com\/[^\s)"'<]+/gi;

// La formulation exacte varie ("Posté dans le groupe indépendant Facebook «
// Les Monstres » : <lien>", "Repéré dans le groupe Facebook Les Monstres.",
// etc.) — plutôt que de deviner tous les verbes possibles, on capture toute
// la phrase (bornée par un point ou une fin de ligne) qui mentionne à la
// fois "groupe" et "facebook". Le groupe capturant en tête préserve l'espace
// qui précède la phrase (sinon "Table. Posté..." perdrait son espace après
// le point). Portée limitée au compte robot (voir loadCandidates), donc sans
// risque de couper une vraie phrase d'utilisateur.
const PHRASE_RE = /(\s*)[^.\n]*\bgroupe\b[^.\n]*\bfacebook\b[^.\n]*\.?/gi;

/** true si le texte contient une trace de Facebook à examiner. */
function looksRelevant(text) {
  // Exclut le texte déjà nettoyé (REPLACEMENT lui-même mentionne "Facebook"),
  // sinon un re-scan le signalerait indéfiniment comme "à vérifier".
  return !!text && text !== REPLACEMENT && /facebook/i.test(text);
}

/** Applique le nettoyage ; retourne le texte inchangé si rien à faire. */
function clean(text) {
  if (!text) return text;
  let out = text.replace(FB_LINK_RE, '');
  out = out.replace(PHRASE_RE, (_match, leadingWs) => `${leadingWs}${REPLACEMENT}`);
  // Nettoyage des espaces/retours à la ligne laissés par les suppressions.
  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

async function loadCandidates(prisma, botId) {
  const items = await prisma.item.findMany({
    where: { userId: botId },
    select: { id: true, title: true, description: true },
  });
  const comments = await prisma.comment.findMany({
    where: { userId: botId },
    select: { id: true, itemId: true, content: true },
  });

  const itemChanges = items
    .filter((i) => looksRelevant(i.description))
    .map((i) => ({ kind: 'item', id: i.id, label: i.title, before: i.description, after: clean(i.description) }));

  const commentChanges = comments
    .filter((c) => looksRelevant(c.content))
    .map((c) => ({ kind: 'comment', id: c.id, label: `item ${c.itemId}`, before: c.content, after: clean(c.content) }));

  return [...itemChanges, ...commentChanges];
}

function printDiff(candidates) {
  const changed = candidates.filter((c) => c.after !== c.before);
  const unresolved = candidates.filter((c) => c.after === c.before);

  console.log(`\n${candidates.length} ligne(s) mentionnant "facebook" trouvée(s) chez le compte robot.\n`);

  for (const c of changed) {
    console.log(`--- ${c.kind} ${c.id} (${c.label}) ---`);
    console.log('AVANT:', JSON.stringify(c.before));
    console.log('APRÈS:', JSON.stringify(c.after));
    console.log('');
  }

  if (unresolved.length) {
    console.log(`⚠️  ${unresolved.length} ligne(s) contiennent "facebook" mais n'ont matché aucun motif connu — à vérifier manuellement, non modifiées :\n`);
    for (const c of unresolved) {
      console.log(`--- ${c.kind} ${c.id} (${c.label}) ---`);
      console.log(JSON.stringify(c.before));
      console.log('');
    }
  }

  console.log(`${changed.length} changement(s) prêt(s) à appliquer, ${unresolved.length} à revoir à la main.`);
  return changed;
}

async function main() {
  const mode = process.argv[2] === 'apply' ? 'apply' : 'scan';

  const botEmail = process.env.IMPORT_BOT_EMAIL;
  if (!botEmail) {
    console.error('IMPORT_BOT_EMAIL non configuré (.env).');
    process.exit(1);
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const bot = await prisma.user.findUnique({ where: { email: botEmail }, select: { id: true } });
  if (!bot) {
    console.error(`Compte robot introuvable (${botEmail}).`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const candidates = await loadCandidates(prisma, bot.id);
  const changed = printDiff(candidates);

  if (mode === 'scan') {
    console.log('\nMode scan : aucune écriture. Relance avec "apply" pour appliquer ces changements.');
    await prisma.$disconnect();
    return;
  }

  if (changed.length === 0) {
    console.log('\nRien à appliquer.');
    await prisma.$disconnect();
    return;
  }

  // Audit avant/après, horodaté, pour pouvoir revenir en arrière au besoin.
  const backupsDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });
  const auditPath = path.join(backupsDir, `clean-facebook-refs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(auditPath, JSON.stringify(changed, null, 2), 'utf8');
  console.log(`\nAudit avant/après écrit dans ${auditPath}`);

  await prisma.$transaction(
    changed.map((c) =>
      c.kind === 'item'
        ? prisma.item.update({ where: { id: c.id }, data: { description: c.after } })
        : prisma.comment.update({ where: { id: c.id }, data: { content: c.after } }),
    ),
  );

  console.log(`\n${changed.length} ligne(s) mise(s) à jour.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
