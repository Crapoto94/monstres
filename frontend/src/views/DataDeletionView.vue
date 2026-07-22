<script setup lang="ts"></script>

<template>
  <section class="flex-1 p-4 pb-24">
    <div class="mb-4 flex items-center gap-2">
      <RouterLink to="/profil" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Retour</RouterLink>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Suppression des données utilisateur</h1>
    </div>

    <div class="prose prose-sm dark:prose-invert max-w-none prose-a:text-brand-600 dark:prose-a:text-brand-400">
      <p>
        Tu peux à tout moment supprimer définitivement ton compte Les Monstres et l'ensemble des données
        associées (profil, photos, Monstres publiés, réservations, notifications), y compris si tu t'es
        connecté via Google ou Facebook.
      </p>

      <h2>Depuis l'application</h2>
      <ol>
        <li>Connecte-toi à ton compte sur <strong>monstres.fbc.fr</strong>.</li>
        <li>Rends-toi sur la page <RouterLink to="/profil">Mon profil</RouterLink>.</li>
        <li>Clique sur le bouton <strong>« Supprimer mon compte »</strong> en bas de page.</li>
        <li>Confirme la suppression : elle est immédiate et irréversible.</li>
      </ol>

      <h2>Que se passe-t-il ?</h2>
      <p>
        La suppression efface immédiatement ton compte, ton profil, tes photos et tous les Monstres que tu
        as publiés de notre base de données et de notre stockage. Cette action ne peut pas être annulée.
      </p>

      <h2>Sans accès à ton compte</h2>
      <p>
        Si tu ne peux pas te connecter (mot de passe perdu, compte lié uniquement à un fournisseur
        externe, etc.), écris-nous à
        <a href="mailto:no-reply@fbc.fr">no-reply@fbc.fr</a> en précisant l'adresse email ou le compte
        Google/Facebook utilisé : nous supprimerons ton compte et tes données sous 30 jours.
      </p>

      <h2>Révoquer l'accès Facebook ou Google</h2>
      <p>
        Supprimer ton compte Les Monstres supprime aussi la liaison avec ton compte Facebook ou Google.
        Tu peux également révoquer l'accès de « Les Monstres » directement depuis les paramètres de ton
        compte Facebook (Paramètres → Applications et sites web) ou Google (Sécurité → Applications tierces
        ayant accès à votre compte) — cela ne supprime toutefois pas automatiquement tes données côté
        Les Monstres, la suppression du compte reste nécessaire.
      </p>

      <p>
        Pour en savoir plus sur le traitement de tes données, consulte notre
        <RouterLink to="/rgpd">politique de confidentialité</RouterLink>.
      </p>
    </div>
  </section>
</template>
