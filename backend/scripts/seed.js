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
  { key: 'ranking_weight_distance', value: '0.5', type: 'FLOAT' },
  { key: 'ranking_weight_popularity', value: '0.25', type: 'FLOAT' },
  { key: 'ranking_weight_recency', value: '0.15', type: 'FLOAT' },
  { key: 'ranking_weight_trust', value: '0.1', type: 'FLOAT' },
  { key: 'pwa_enabled', value: 'true', type: 'BOOLEAN' },
  { key: 'whatsapp_test_mode', value: 'false', type: 'BOOLEAN' },
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

const DEFAULT_TUTORIAL_PAGES = [
  {
    order: 0,
    title: 'Bienvenue sur Les Monstres !',
    icon: '👋',
    content: '<p>Les Monstres, c\'est une communauté de citoyens qui repèrent, partagent et récupèrent les objets encombrants abandonnés dans la rue.</p><p>Un canapé abandonné, une vieille armoire, un vélo rouillé… Ce sont des <strong>Monstres</strong> ! Et chacun peut les signaler pour qu\'un autre les récupère.</p>',
    active: true,
  },
  {
    order: 1,
    title: 'Comment ça marche ?',
    icon: '📸',
    content: '<p>C\'est simple et rapide — <strong>moins de 30 secondes</strong> :</p><ol><li><strong>Photo</strong> — prends une photo du Monstre</li><li><strong>Position</strong> — l\'app détecte automatiquement où tu es</li><li><strong>Titre</strong> — donne un nom au Monstre (ex. "Canapé gris 3 places")</li><li><strong>Publie</strong> — c\'est fait !</li></ol><p>Les autres utilisateurs pourront alors le voir, le voter, le réserver ou le récupérer.</p>',
    active: true,
  },
  {
    order: 2,
    title: 'Règles de respect',
    icon: '🤝',
    content: '<p>Pour que la communauté reste saine et fiable :</p><ul><li><strong>Photos honnêtes</strong> — montre le vrai état de l\'objet, pas de photo trompeuse</li><li><strong>Position exacte</strong> — sois précis sur la localisation</li><li><strong>Contenu respectueux</strong> — pas de photo ou texte inapproprié</li><li><strong>Pas de doublons</strong> — vérifie si le Monstre n\'est pas déjà signalé</li></ul><p>La communauté peut signaler les abus. Les faux signalements entraînent des avertissements, puis des sanctions.</p>',
    active: true,
  },
  {
    order: 3,
    title: 'La communauté',
    icon: '⭐',
    content: '<p>Les Monstres, c\'est aussi un jeu collectif :</p><ul><li><strong>Votes</strong> — clique "Vaut le déplacement" pour valoriser les bons Monstres</li><li><strong>Commentaires</strong> — donne des infos ("Encore là à 18h", "Il faut être deux")</li><li><strong>Réservations</strong> — reserve un Monstre pour éviter que d\'autres se déplacent inutilement</li><li><strong>Badges & score</strong> — gagne des récompenses en contribuant</li></ul><p>Bienvenue dans la communauté, et bonnes chasses aux Monstres ! 🎉</p>',
    active: true,
  },
];

const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'email_verification',
    name: 'Vérification d\'email',
    subject: 'Confirme ton adresse email — Les Monstres',
    isSystem: true,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#7c3aed;">Bienvenue sur Les Monstres !</h2>
  <p>Bonjour <strong>{{user_name}}</strong>,</p>
  <p>Confirme ton adresse email pour activer ton compte :</p>
  <p style="text-align:center;margin:30px 0;">
    <a href="{{verification_url}}" style="background:#7c3aed;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Confirmer mon email</a>
  </p>
  <p style="color:#888;font-size:12px;">Ce lien expire dans quelques heures. Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>
</div>`,
  },
  {
    key: 'password_reset',
    name: 'Réinitialisation mot de passe',
    subject: 'Réinitialise ton mot de passe — Les Monstres',
    isSystem: true,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#7c3aed;">Mot de passe oublié</h2>
  <p>Bonjour <strong>{{user_name}}</strong>,</p>
  <p>Une demande de réinitialisation de mot de passe a été effectuée pour ce compte.</p>
  <p style="text-align:center;margin:30px 0;">
    <a href="{{reset_url}}" style="background:#7c3aed;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Réinitialiser mon mot de passe</a>
  </p>
  <p style="color:#888;font-size:12px;">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>
</div>`,
  },
  {
    key: 'new_item_nearby',
    name: 'Nouveau Monstre à proximité',
    subject: 'Nouveau Monstre près de chez toi — Les Monstres',
    isSystem: true,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#7c3aed;">Nouveau Monstre détecté !</h2>
  <p>Un nouveau Monstre <strong>"{{item_title}}"</strong> est apparu près d'une de tes zones surveillées.</p>
  {{item_photo_url}}<p><a href="{{item_url}}" style="color:#7c3aed;font-weight:bold;">Voir ce Monstre →</a></p>
</div>`,
  },
  {
    key: 'reservation_created',
    name: 'Réservation créée',
    subject: '{{reserver_name}} a réservé ton Monstre — Les Monstres',
    isSystem: true,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#7c3aed;">Monstre réservé</h2>
  <p>Ton Monstre <strong>"{{item_title}}"</strong> vient d'être réservé par <strong>{{reserver_name}}</strong>.</p>
  <p>La réservation est temporaire. Si elle expire, le Monstre redeviendra disponible pour tous.</p>
  <p><a href="{{item_url}}" style="color:#7c3aed;font-weight:bold;">Voir le Monstre →</a></p>
</div>`,
  },
  {
    key: 'item_collected',
    name: 'Monstre récupéré',
    subject: 'Ton Monstre a été récupéré — Les Monstres',
    isSystem: true,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#22c55e;">Monstre récupéré !</h2>
  <p>Ton Monstre <strong>"{{item_title}}"</strong> a été récupéré par <strong>{{collector_name}}</strong>.</p>
  <p>Merci d'avoir participé au réemploi ! Chaque objet récupéré, c'est un de moins à la déchetterie. 🌱</p>
  <p><a href="{{item_url}}" style="color:#7c3aed;font-weight:bold;">Voir le Monstre →</a></p>
</div>`,
  },
  {
    key: 'badge_unlocked',
    name: 'Badge débloqué',
    subject: 'Badge débloqué : {{badge_name}} — Les Monstres',
    isSystem: true,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#7c3aed;">Badge débloqué ! 🏆</h2>
  <p>Bravo ! Tu as débloqué le badge <strong>"{{badge_name}}"</strong>.</p>
  <p>Continue comme ça, la communauté compte sur toi !</p>
</div>`,
  },
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

  for (const page of DEFAULT_TUTORIAL_PAGES) {
    const existing = await prisma.tutorialPage.findFirst({ where: { title: page.title } });
    if (!existing) {
      await prisma.tutorialPage.create({ data: page });
      console.log(`+ page tutoriel : ${page.title}`);
    }
  }

  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key: template.key } });
    if (!existing) {
      await prisma.emailTemplate.create({ data: template });
      console.log(`+ template email : ${template.key}`);
    }
  }

  // Contenu RGPD et Mentions légales (modifiables depuis /admin/parametres)
  const LEGAL_SETTINGS = [
    {
      key: 'legal_notices',
      value: `<h2>Mentions légales</h2>
<p><strong>Éditeur du site</strong><br>Les Monstres — Application communautaire de repérage et récupération d'objets encombrants abandonnés.</p>
<p><strong>Contact</strong><br>Pour toute question, contacte-nous via l'application ou à l'adresse email indiquée dans les paramètres de ton compte.</p>
<p><strong>Hébergement</strong><br>Ce site est hébergé sur un serveur Proxmox.</p>
<p><strong>Propriété intellectuelle</strong><br>Le contenu publié par les utilisateurs (photos, descriptions) reste leur propriété. L'application Les Monstres se réserve le droit d'utiliser le contenu publié dans le cadre du fonctionnement du service.</p>
<p><strong>Responsabilité</strong><br>Les Monstres agit comme intermédiaire technique. La responsabilité du contenu publié incombe à chaque utilisateur. Les administrateurs se réservent le droit de modérer ou supprimer tout contenu contraire aux règles de la communauté.</p>`,
      type: 'JSON',
    },
    {
      key: 'rgpd_content',
      value: `<h2>Politique de confidentialité (RGPD)</h2>
<h3>1. Données collectées</h3>
<p>Lors de ton inscription et de ton utilisation de Les Monstres, nous collectons :</p>
<ul>
  <li><strong>Données d'inscription</strong> : nom, adresse email, mot de passe (chiffré)</li>
  <li><strong>Données de publication</strong> : photos, descriptions, localisation GPS des Monstres signalés</li>
  <li><strong>Données de navigation</strong> : historique des actions (votes, réservations, commentaires, signalements)</li>
  <li><strong>Métadonnées techniques</strong> : adresse IP, système d'exploitation, navigateur (à l'inscription et à la connexion)</li>
</ul>

<h3>2. Finalité du traitement</h3>
<p>Tes données sont utilisées pour :</p>
<ul>
  <li>Le fonctionnement du service (publication, réservation, récupération des Monstres)</li>
  <li>La gestion de ta compte et de ton score communautaire</li>
  <li>L'envoi de notifications email (si activées) : nouveaux Monstres à proximité, réservations, récupérations</li>
  <li>La modération et la sécurité du service (signalements, sanctions)</li>
  <li>Les statistiques anonymisées du service</li>
</ul>

<h3>3. Durée de conservation</h3>
<p>Tes données personnelles sont conservées tant que ton compte est actif. En cas de suppression de compte, tes données personnelles sont effacées dans un délai de 30 jours, à l'exception des données anonymisées nécessaires au fonctionnement des statistiques.</p>

<h3>4. Tes droits (RGPD)</h3>
<p>Conformément au Règlement Général sur la Protection des Données, tu dispose des droits suivants :</p>
<ul>
  <li><strong>Droit d'accès</strong> : obtenir une copie de tes données personnelles</li>
  <li><strong>Droit de rectification</strong> : corriger tes données inexactes</li>
  <li><strong>Droit à l'effacement</strong> : demander la suppression de tes données</li>
  <li><strong>Droit à la portabilité</strong> : récupérer tes données dans un format structuré</li>
  <li><strong>Droit d'opposition</strong> : t'opposer au traitement de tes données</li>
</ul>
<p>Pour exercer ces droits, utilise les paramètres de ton compte ou contacte-nous via l'application.</p>

<h3>5. Notifications email</h3>
<p>Tu peux activer ou désactiver les notifications email depuis ton profil. Les notifications concernent uniquement l'activité en lien avec tes Monstres et tes zones surveillées.</p>

<h3>6. Sécurité</h3>
<p>Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger tes données : mots de passe chiffrés, cookies httpOnly, accès restreint aux données.</p>

<h3>7. Contact</h3>
<p>Pour toute question relative à la protection de tes données, contacte-nous via l'application.</p>`,
      type: 'JSON',
    },
  ];

  for (const setting of LEGAL_SETTINGS) {
    const existing = await prisma.setting.findUnique({ where: { key: setting.key } });
    if (!existing) {
      await prisma.setting.create({ data: setting });
      console.log(`+ setting ${setting.key}`);
    }
  }

  // Contenu "Pourquoi les Monstres" (modifiable depuis /admin/parametres)
  const missionExists = await prisma.setting.findUnique({ where: { key: 'mission_content' } });
  if (!missionExists) {
    await prisma.setting.create({
      data: {
        key: 'mission_content',
        value: `<p>Chaque jour, des objets encombrants sont abandonnés dans la rue — meubles, électroménager, livres, jouets… La plupart finissent à la déchetterie, voire en dépôt sauvage, faute d'avoir trouvé un second propriétaire.</p>
<p><strong>Les Monstres</strong> existe pour changer ça. Notre mission : <em>redonner vie aux objets abandonnés</em> en créant un lien direct entre ceux qui les laissent et ceux qui peuvent les récupérer.</p>
<h2>🌍 Un engagement environnemental</h2>
<p>Recycler, c'est bien. Réutiliser, c'est mieux. Chaque Monstre récupéré, c'est un objet de moins qui pollue et de moins qu'il faut fabriquer neuf. En participant, tu contribues directement à réduire les déchets et l'empreinte carbone de ta communauté.</p>
<h2>🤝 La force du partage</h2>
<p>Les Monstres, c'est avant tout une communauté. On partage, on s'entraide, on donne une seconde chance aux objets. Un canapé qui ne te sert plus peut devenir le coin canapé parfait de quelqu'un d'autre. C'est la beauté du réusage : rien ne se perd, tout se transforme.</p>
<h2>♻️ Ensemble, on fait bouger les choses</h2>
<p>Plus on est nombreux à signaler et récupérer les Monstres, plus on crée un cercle vertueux. Chaque récupération est un petit pas pour la planète, et un grand pas pour ta communauté. Rejoins-nous — ensemble, on transforme les déchets en opportunités.</p>`,
        type: 'JSON',
      },
    });
    console.log('+ setting mission_content');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
