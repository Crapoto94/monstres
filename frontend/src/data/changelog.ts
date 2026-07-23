export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
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
