export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.17',
    date: '1 août 2026',
    changes: [
      'Admin → Sauvegardes : sauvegarde automatique quotidienne de la base (04:00), avec email de confirmation au super-admin et lien de téléchargement',
      'Admin → Sauvegardes : création manuelle, téléchargement, suppression, restauration depuis une sauvegarde locale ou un fichier uploadé',
    ],
  },
  {
    version: '1.0.16',
    date: '1 août 2026',
    changes: [
      'Carte : correction du rechargement — déplacer le curseur ne vide plus la carte (rechargement débouncé, marqueurs conservés si l\'erreur)',
      'Carte : granularité du curseur fixée à 1 jour, 2 jours, 3 jours, 1 semaine, 1 mois, 1 an, 2 ans',
    ],
  },
  {
    version: '1.0.15',
    date: '1 août 2026',
    changes: [
      'Carte : nouveau curseur temporel — filtre les Monstres affichés de 1 jour à 2 ans (défaut : 1 semaine)',
    ],
  },
  {
    version: '1.0.14',
    date: '1 août 2026',
    changes: [
      'Commentaires : les liens (y compris « Posté dans le groupe Facebook ») sont maintenant cliquables',
    ],
  },
  {
    version: '1.0.13',
    date: '30 juillet 2026',
    changes: [
      'Profil : modification du pseudo et de l\'email directement depuis la fiche',
      'Profil : si l\'email change, il repasse en « non vérifié » — un email de confirmation est envoyé',
      'Profil : bouton « Renvoyer » l\'email de vérification',
      'Commentaires : réactions aux commentaires (👍 ❤️ 😄 😮 😢 😡) avec toggle',
    ],
  },
  {
    version: '1.0.12',
    date: '30 juillet 2026',
    changes: [
      'Admin → Commentaires : nouvelle page listant tous les commentaires par date, avec modération (suppression)',
      'Admin → Utilisateurs : nouvelles colonnes commentaires, zones d\'alerte, mails d\'alerte',
      'Admin → Statistiques : les comptes supprimés affichent « Utilisateur·ice parti·e » au lieu d\'un ID brut',
    ],
  },
  {
    version: '1.0.11',
    date: '29 juillet 2026',
    changes: [
      'Email : fallback vers .env quand les settings base sont absents (rétrocompatibilité prod)',
    ],
  },
  {
    version: '1.0.10',
    date: '29 juillet 2026',
    changes: [
      'Email SMTP : vérification de connexion avant envoi (transporter.verify)',
      'Email SMTP : détection des destinataires rejetés par le serveur',
      'Test email : messages d\'erreur précis selon la cause (connexion, auth, expéditeur rejeté)',
    ],
  },
  {
    version: '1.0.9',
    date: '29 juillet 2026',
    changes: [
      'Email : choix entre Brevo et SMTP depuis Admin → Paramètres (setting email_provider)',
      'Config SMTP (host, port, user, pass, SSL/TLS, expéditeur) éditable depuis l\'admin sans redéploiement',
      'Config Brevo (API key, expéditeur) éditable depuis l\'admin sans redéploiement',
      'Bouton de test d\'envoi dans les paramètres email',
      'Admin : sidebar sticky, seul le contenu à droite défile',
      'Barre de navigation basse cachée dans les pages admin',
    ],
  },
  {
    version: '1.0.8',
    date: '29 juillet 2026',
    changes: [
      'Envoi d\'emails : Brevo remplacé par SMTP (nodemailer) — configurable dans .env',
      'Nouveaux paramètres : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME',
    ],
  },
  {
    version: '1.0.7',
    date: '28 juillet 2026',
    changes: [
      'Admin emails : correction de l\'édition des templates (le QuillEditor supprimait les variables {{variable}} dans les attributs HTML)',
      'Footer des emails : lien actualisé vers monstres.app',
    ],
  },
  {
    version: '1.0.6',
    date: '28 juillet 2026',
    changes: [
      "Conditions Générales d'Utilisation : nouvelle page /cgu avec 14 articles, éditable depuis Admin → Paramètres",
      "Communauté : les membres sont triés alphabétiquement, barre de recherche par nom, les pseudos admin sont masqués",
    ],
  },
  {
    version: '1.0.5',
    date: '27 juillet 2026',
    changes: [
      "Ressourceries : bouton « ? » pour voir les détails (adresse, téléphone, site, horaires…)",
      "Itinéraire : les liens « Y aller » ouvrent OpenStreetMap sur PC (au lieu du geo: qui ne marchait pas)",
    ],
  },
  {
    version: '1.0.4',
    date: '27 juillet 2026',
    changes: [
      "Correction du bouton popup ressourceries : « Trouve une ressourcerie » (et non « déchèterie »)",
    ],
  },
  {
    version: '1.0.3',
    date: '27 juillet 2026',
    changes: [
      "Correction : le bouton « Sauvegarder » du disclaimer page « Ajouter » fonctionne désormais correctement (le setting est créé en base au premier enregistrement)",
    ],
  },
  {
    version: '1.0.2',
    date: '27 juillet 2026',
    changes: [
      "Page « Ajouter » : les ressourceries et recycleries s'affichent dans une popup dédiée (bouton « Trouve une ressourcerie »)",
      "Le bouton « Y aller » des ressourceries ouvre désormais directement l'app GPS du téléphone (comme pour les Monstres)",
      "Position en cache 2 minutes : les ressourceries s'affichent instantanément quand on navigue vers la page « Ajouter »",
    ],
  },
  {
    version: '1.0.1',
    date: '27 juillet 2026',
    changes: [
      "Page « Ajouter » : avertissement éditable en admin rappelant qu'il s'agit de déclarer un Monstre existant (et non de déposer un objet) — dépôt sur l'espace public interdit",
      "Page « Ajouter » : affichage des ressourceries et recycleries à proximité (données gogocompact + Emmaüs)",
    ],
  },
  {
    version: '1.0.0',
    date: '27 juillet 2026',
    changes: [
      "Version officielle 1.0.0",
      "Newsletter : éditeur WYSIWYG (gras, italique, listes, liens, images) — les retours à la ligne et le formatage sont désormais correctement interprétés",
      "Référencement Google : nom de site affiché dans les résultats de recherche mis à jour en « Les monstres - L'appli » (title, og:site_name, JSON-LD)",
    ],
  },
  {
    version: '0.5.1',
    date: '26 juillet 2026',
    changes: [
      "Console SQL admin : les requêtes d'écriture (INSERT, UPDATE, DELETE…) sont désormais autorisées, avec affichage du nombre de lignes affectées",
      "Correction déconnexion : le cookie JWT est maintenant correctement effacé (clearCookie sans maxAge)",
      "Correction écran admin : le tableau de bord ne reste plus bloqué sur « Chargement… » en cas d'erreur",
      "Nettoyage du store auth : réinitialisation complète à la déconnexion",
    ],
  },
  {
    version: '0.5.0',
    date: '26 juillet 2026',
    changes: [
      "Référencement Google : domaine canonique monstres.app (l'ancien domaine redirige désormais vers lui), robots.txt et plan du site, page « pourquoi » et fiches Monstre lisibles par les moteurs de recherche sans exécuter l'application",
      "Newsletter d'actualité (admin) : envoi manuel aux membres inscrits, dans la limite d'une fois par semaine",
    ],
  },
  {
    version: '0.4.40',
    date: '26 juillet 2026',
    changes: [
      "Nouvel écran « Statistiques » en admin : consultations, visiteurs uniques, systèmes d'exploitation, navigateurs, appareils et pays, sous forme anonymisée",
      "Correctif : les visiteurs sur iPhone/iPad étaient classés à tort en macOS",
    ],
  },
  {
    version: '0.4.39',
    date: '26 juillet 2026',
    changes: [
      "Le journal d'import (admin) indique désormais quelle machine a exécuté chaque passage de la routine, utile quand plusieurs machines tournent en parallèle",
    ],
  },
  {
    version: '0.4.38',
    date: '26 juillet 2026',
    changes: [
      "Correctif : les accents (é, è, à…) étaient corrompus dans le titre et la description de certains Monstres importés automatiquement depuis Facebook",
    ],
  },
  {
    version: '0.4.37',
    date: '26 juillet 2026',
    changes: [
      "Nouveau : un journal de la routine d'import Facebook, consultable en administration (annonces trouvées, importées ou laissées de côté)",
    ],
  },
  {
    version: '0.4.36',
    date: '26 juillet 2026',
    changes: [
      "Correctif : la fenêtre \"Quoi de neuf\" restait bloquée sur la version 0.4.31 et n'affichait plus les nouveautés récentes",
    ],
  },
  {
    version: '0.4.35',
    date: '26 juillet 2026',
    changes: [
      'Un Monstre non récupéré est archivé automatiquement 24h après sa publication — retrouvable dans un nouvel onglet "Archives" (consultation seule)',
      'Sur la carte, les Monstres sont affichés avec le logo de la mascotte ; les archives apparaissent en plus petit',
      'Les Monstres relayés depuis Facebook peuvent désormais avoir plusieurs photos',
    ],
  },
  {
    version: '0.4.34',
    date: '26 juillet 2026',
    changes: [
      'Le compte qui relaie les Monstres depuis notre groupe Facebook a maintenant son propre avatar (la mascotte)',
    ],
  },
  {
    version: '0.4.33',
    date: '25 juillet 2026',
    changes: [
      'Les Monstres relayés depuis Facebook sont désormais visibles immédiatement, sans attendre de validation',
    ],
  },
  {
    version: '0.4.32',
    date: '25 juillet 2026',
    changes: [
      'Premiers Monstres relayés automatiquement depuis notre groupe Facebook communautaire',
    ],
  },
  {
    version: '0.4.31',
    date: '25 juillet 2026',
    changes: [
      'Adresse : le numéro de rue le plus proche est préféré même quand ce n\'est pas le tout premier résultat renvoyé par la BAN (ex. place/rue à distance quasi identique)',
    ],
  },
  {
    version: '0.4.30',
    date: '25 juillet 2026',
    changes: [
      'Adresse (géolocalisation + recherche) : passage à la BAN (Base Adresse Nationale, data.gouv.fr) — bien meilleure couverture des numéros de rue que Nominatim/OSM en France',
    ],
  },
  {
    version: '0.4.29',
    date: '25 juillet 2026',
    changes: [
      'Fix : les photos de smartphone (10-15 Mo) faisaient échouer la publication — redimensionnement automatique à 4 mégapixels avant envoi',
      'Adresse simplifiée (numéro + rue + ville, ex. "10 rue de Rivoli, Paris") au lieu de l\'adresse complète Nominatim (département, région, code postal…)',
    ],
  },
  {
    version: '0.4.28',
    date: '24 juillet 2026',
    changes: [
      'GPS actif par défaut en permanence — persistance localStorage, désactivable dans la modale',
    ],
  },
  {
    version: '0.4.27',
    date: '24 juillet 2026',
    changes: [
      'Bouton GPS sur l\'accueil : fenêtre d\'explication avec texte modifiable en admin, activation/désactivation',
      'GPS actif par défaut au chargement de la page',
      'Bouton "Y aller" restauré sur le détail d\'un Monstre',
    ],
  },
  {
    version: '0.4.25',
    date: '24 juillet 2026',
    changes: [
      'Alerte email à l\'admin (admin@fbc.fr) à chaque nouvel inscrit — désactivable dans les paramètres admin',
    ],
  },
  {
    version: '0.4.24',
    date: '24 juillet 2026',
    changes: [
      'Fix : les toggles (on/off) des paramètres admin ne sauvegardaient jamais réellement',
    ],
  },
  {
    version: '0.4.23',
    date: '24 juillet 2026',
    changes: [
      'Bandeau "version bêta" (désactivable en admin) prévenant que les Monstres affichés ne sont peut-être pas réels',
    ],
  },
  {
    version: '0.4.22',
    date: '23 juillet 2026',
    changes: [
      'Fix : le service worker des notifications push pouvait rester bloqué sur une ancienne version',
    ],
  },
  {
    version: '0.4.21',
    date: '23 juillet 2026',
    changes: [
      'Notifications push : opt-in dans le profil, reçues même appli fermée',
    ],
  },
  {
    version: '0.4.20',
    date: '23 juillet 2026',
    changes: [
      'Fix : photo manquante dans la file de signalements admin',
      'Admin en pleine largeur sur desktop (vue mobile inchangée)',
    ],
  },
  {
    version: '0.4.19',
    date: '23 juillet 2026',
    changes: [
      'Support de plusieurs noms de domaine pointant vers le même serveur (ex. monstres.app)',
    ],
  },
  {
    version: '0.4.18',
    date: '23 juillet 2026',
    changes: [
      'Fix : page d\'erreur brute lors d\'un échec de connexion Google/Facebook (surtout mobile)',
    ],
  },
  {
    version: '0.4.17',
    date: '23 juillet 2026',
    changes: [
      'Fix : message d\'erreur clair dans le journal WhatsApp en cas de jeton invalide',
    ],
  },
  {
    version: '0.4.16',
    date: '23 juillet 2026',
    changes: [
      'Notifications WhatsApp réservées aux comptes admin le temps de la validation Meta',
    ],
  },
  {
    version: '0.4.15',
    date: '23 juillet 2026',
    changes: [
      'Modèle maître pour tous les emails : logo + en-tête + pied de page sur chaque email sortant',
      'Admin email : le template maître est mis en avant avec badge "WRAPPER"',
    ],
  },
  {
    version: '0.4.14',
    date: '23 juillet 2026',
    changes: [
      '/profil redirige vers la connexion si non connecté',
      'Bouton "S\'inscrire" plus visible sur la page de connexion',
    ],
  },
  {
    version: '0.4.13',
    date: '23 juillet 2026',
    changes: [
      'Journal des messages WhatsApp envoyés, y compris les tests (SUPER_ADMIN)',
      'Connexion Facebook masquée le temps de la validation Meta',
    ],
  },
  {
    version: '0.4.12',
    date: '23 juillet 2026',
    changes: [
      'Tri par défaut sur la distance ("Proches") au lieu du plus récent',
      'Aperçu avec photo quand le lien d\'un Monstre est partagé sur Facebook/WhatsApp',
      'Presse-papier de partage enrichi (nom, adresse, lien)',
    ],
  },
  {
    version: '0.4.11',
    date: '23 juillet 2026',
    changes: [
      'Mentions légales, RGPD et suppression des données éditables depuis l\'admin',
    ],
  },
  {
    version: '0.4.10',
    date: '23 juillet 2026',
    changes: [
      'Partage du Monstre dans le groupe Facebook à la publication',
      'Fix des marges blanches autour du logo sur l\'accueil',
    ],
  },
  {
    version: '0.4.9',
    date: '23 juillet 2026',
    changes: [
      'Adresse raccourcie sur la fiche Monstre (numéro, rue, ville)',
    ],
  },
  {
    version: '0.4.8',
    date: '23 juillet 2026',
    changes: [
      'Journal d\'activité et journal des emails (SUPER_ADMIN)',
      'Lightbox zoom molette (desktop) et pincement (mobile)',
      'Style des contenus HTML (/pourquoi, mentions légales, RGPD)',
      'Logo x1.7 sur l\'accueil',
    ],
  },
  {
    version: '0.4.7',
    date: '23 juillet 2026',
    changes: [
      'Fix des avatars dans les commentaires',
      'Fix de la troncature des photos d\'objets',
      'Fix du double-wrapping axios sur /pourquoi',
    ],
  },
  {
    version: '0.4.6',
    date: '23 juillet 2026',
    changes: [
      'Admin paramètres : redesign complet avec descriptions, toggle, textarea avec aperçu',
      'Seed : mise à jour automatique du contenu /pourquoi',
    ],
  },
  {
    version: '0.4.5',
    date: '22 juillet 2026',
    changes: [
      'Autocomplete des adresses dans les zones d\'alerte',
      'Adresses simplifiées (rue + ville)',
      'Les intérêts n\'envoient plus d\'emails',
    ],
  },
  {
    version: '0.4.3',
    date: '22 juillet 2026',
    changes: [
      'Saisie prédictive des adresses avec Nominatim',
    ],
  },
  {
    version: '0.4.2',
    date: '22 juillet 2026',
    changes: [
      'Avatar : emojis sous un bouton dépliable',
      'Bouton « C\'est quoi ? » pour les non-inscrits',
      'Page « Pourquoi » avec section gratuité',
    ],
  },
  {
    version: '0.4.1',
    date: '22 juillet 2026',
    changes: [
      'Liens légaux en boutons cliquables dans le profil',
      'Photo de récupération en grand (comme le signalement)',
      'Choix entre géolocalisation et adresse pour les alertes',
      'Tri récents / proches sur l\'accueil',
    ],
  },
  {
    version: '0.4.0',
    date: '22 juillet 2026',
    changes: [
      'Outil de recadrage d\'avatar circulaire',
      'Emails insensibles à la casse',
      'Confirmation du mot de passe en réinitialisation',
      'Page « Pourquoi Les Monstres »',
      'Logos plus grands sur l\'accueil et la connexion',
    ],
  },
  {
    version: '0.3.9',
    date: '21 juillet 2026',
    changes: [
      'Système de signalements avec photo GPS EXIF',
      'Admin utilisateurs enrichi (avatar, historique, IPs)',
      'Bouton installation PWA dans le profil',
      'Logo plus grand, nouveau design de la page d\'accueil',
    ],
  },
  {
    version: '0.3.4',
    date: '20 juillet 2026',
    changes: [
      'Refonte du profil (avatars, upload, infos)',
      'Mentions légales et RGPD',
      'Layout admin responsive desktop',
    ],
  },
  {
    version: '0.3.2',
    date: '19 juillet 2026',
    changes: [
      'Pastilles de stats sur le dashboard admin',
      'Fix de la console SQL admin',
    ],
  },
  {
    version: '0.3.1',
    date: '19 juillet 2026',
    changes: [
      'Tutorial d\'onboarding pour les nouveaux utilisateurs',
      'Templates d\'emails personnalisables',
    ],
  },
  {
    version: '0.3.0',
    date: '18 juillet 2026',
    changes: [
      'Refonte graphique complète',
      'Nouvelle charte visuelle et couleurs',
    ],
  },
]
