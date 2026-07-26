# VM dédiée — routine d'import Facebook

Machine légère, allumée en permanence, pour faire tourner la routine d'import
(groupe Facebook → Monstres) sans dépendre du PC principal de l'utilisateur.
Contexte complet dans `PROGRESS.md` à la racine du projet.

**Important (à ne pas perdre de vue)** : cette VM garde une vraie session
Chrome humaine, connectée normalement à Facebook — ce n'est **pas** un
scraper autonome ni un dispositif d'évasion de détection. L'objectif est
uniquement de ne plus dépendre du PC principal, pas de contourner les
protections anti-bot de Facebook.

## ⚠️ Piège majeur : type de CPU de la VM

**Le CPU de la VM doit être réglé sur `host`** (`qm set <VMID> --cpu host`, ou
dans l'UI Proxmox : VM → Hardware → Processeurs → Type = `host`). Le script
`01-create-vm-proxmox.sh` le fait déjà.

Avec le type par défaut (`kvm64`), le binaire natif de Claude Code part dans
une boucle à **100 % de CPU sans jamais rendre la main**, y compris sur un
simple `claude --version`. L'appli desktop plante de la même façon puisqu'elle
embarque le même binaire.

Le symptôme est très trompeur : `node --version` et `npm` répondent
normalement, ce qui oriente à tort vers un problème d'installation npm, de
version de Node, de DNS ou de RAM. En réalité **Claude Code n'utilise pas le
Node du système à l'exécution** — c'est un binaire natif compilé avec des jeux
d'instructions que `kvm64` n'expose pas. Plusieurs heures ont été perdues sur
ces fausses pistes avant d'identifier la cause.

## 0. Vérifier la marge disponible sur le NUC

Le Proxmox tourne sur un NUC (ressources partagées avec le reste des
services, dont l'appli Monstres elle-même). Avant de lancer la VM :

```bash
free -h        # RAM totale et disponible sur le NUC
nproc          # nombre de cœurs
```

La VM proposée ici demande **4 Go de RAM / 2 vCPU**. Ce n'est pas négociable à
la baisse : la documentation officielle de Claude Code exige 4 Go **pour lui
seul**, et il faut encore loger Chrome et Xfce par-dessus. Réduire `MEMORY_MB`
dans `01-create-vm-proxmox.sh` fera planter Chrome ou Claude plutôt
qu'économiser des ressources utilement.

**Ne pas installer l'appli desktop Claude sur cette VM** : elle lance plusieurs
processus lourds (Electron + le CLI en sous-processus) et sature la machine.
Le CLI `claude` en terminal suffit et c'est ce que décrit ce guide.

## 1. Créer la VM (sur le Proxmox)

Éditer les paramètres en tête de `01-create-vm-proxmox.sh` (`STORAGE`,
`BRIDGE` notamment), puis lancer le script **en fournissant le mot de passe
par variable d'environnement** — il n'a pas de valeur par défaut et le script
refuse de démarrer sans :

```bash
CI_PASSWORD='choisis-un-mot-de-passe' bash 01-create-vm-proxmox.sh
```

Ce mot de passe ne sert qu'au premier accès (console Proxmox / SSH avant que
la clé publique soit en place). Le connecter à la VM puis le changer avec
`passwd` reste une bonne pratique.

Récupérer l'IP de la VM (laisser ~30-60s à cloud-init pour terminer) :

```bash
qm guest cmd 900 network-get-interfaces
```

## 2. Installer le bureau + Chrome + Node + Claude Code (dans la VM)

```bash
ssh monstres@<IP-VM>
bash 02-setup-vm.sh
```

Le script demande un mot de passe VNC en cours de route (`vncpasswd`).

## 3. Étapes manuelles (ne peuvent pas être scriptées)

Depuis ta machine, ouvrir un tunnel SSH puis un client VNC :

```bash
ssh -L 5901:localhost:5901 monstres@<IP-VM>
```

Puis connecter un client VNC (TigerVNC Viewer, RealVNC…) sur
`localhost:5901`.

Dans le bureau Xfce qui s'affiche :

1. **Ouvrir Chrome, se connecter à Facebook** normalement (identifiants
   entrés par toi, jamais par moi).
2. **Ouvrir un terminal Xfce**, lancer `claude`, se connecter avec ton
   compte Anthropic (flux de login standard).
3. Installer/connecter l'extension **Claude in Chrome** dans ce Chrome —
   même procédure que sur ton PC principal.
4. Une fois connecté, redonner à cette nouvelle session le contexte de la
   routine : lui coller le prompt de la tâche planifiée (récupérable via
   `CronList` dans la session d'origine, ou redemander à Claude de le
   reconstruire à partir de `PROGRESS.md`), puis relancer un `CronCreate`
   **dans cette session-là**.

## 4. Une fois la VM opérationnelle

- **Arrêter le `CronCreate` de la session d'origine** (celle sur le PC
  principal) pour éviter un double travail — `CronDelete` avec l'ID du job.
  Ce n'est pas dangereux de laisser les deux tourner (l'anti-doublon serveur
  empêche les recréations), juste inutile.
- Le journal d'import (`/admin/journal-import`) reste la même vue quelle que
  soit la machine qui exécute la routine — rien à changer côté appli.
