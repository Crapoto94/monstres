export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.4.26',
    date: '24 juillet 2026',
    changes: [
      'Bouton GPS sur l\'accueil : fenêtre d\'explication avec texte modifiable en admin, activation/désactivation',
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
