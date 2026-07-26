#!/bin/bash
# Crée une VM Debian 12 minimale sur Proxmox, destinée à faire tourner en
# permanence une session Claude Code + Chrome connecté à Facebook, pour la
# routine d'import des Monstres. À lancer SUR le Proxmox (shell de l'hôte),
# pas dans un conteneur ni une VM.
#
# Usage : adapter les 6 paramètres ci-dessous puis `bash 01-create-vm-proxmox.sh`.
set -euo pipefail

# === Paramètres à adapter à ton Proxmox ===
VMID=900                          # ID libre — vérifie avec `qm list`
VMNAME="monstres-import-bot"
STORAGE="local-lvm"               # nom de ton pool de stockage — vérifie avec `pvesm status`
BRIDGE="vmbr0"                    # ton bridge réseau — vérifie avec `ip a` ou l'UI Proxmox
DISK_SIZE="20G"
MEMORY_MB=4096                    # 4 Go — Claude Code exige 4 Go à lui seul (doc officielle) ; en dessous, Chrome + Xfce font déborder
CORES=2
SSH_PUBKEY="${HOME}/.ssh/id_rsa.pub"   # ta clé publique SSH, pour t'y connecter ensuite sans mot de passe
CI_USER="monstres"

# Mot de passe du compte cloud-init : fourni par variable d'environnement,
# JAMAIS écrit en dur ici — ce fichier est versionné sur GitHub. Un mot de
# passe « provisoire » laissé dans le script devient le vrai mot de passe de
# la VM, c'est exactement ce qui s'est produit lors du premier montage.
#   CI_PASSWORD='...' bash 01-create-vm-proxmox.sh
CI_PASSWORD="${CI_PASSWORD:-}"
if [ -z "$CI_PASSWORD" ]; then
  echo "Erreur : définis CI_PASSWORD avant de lancer ce script, par exemple :" >&2
  echo "  CI_PASSWORD='monMotDePasse' bash 01-create-vm-proxmox.sh" >&2
  exit 1
fi

IMG_DIR="/var/lib/vz/template/iso"
IMG_FILE="debian-12-genericcloud-amd64.qcow2"
IMG_URL="https://cloud.debian.org/images/cloud/bookworm/latest/${IMG_FILE}"

echo "== Téléchargement de l'image Debian 12 cloud (une seule fois) =="
mkdir -p "$IMG_DIR"
if [ ! -f "${IMG_DIR}/${IMG_FILE}" ]; then
  wget -O "${IMG_DIR}/${IMG_FILE}" "$IMG_URL"
fi

echo "== Création de la VM $VMID ($VMNAME) =="
# --cpu host est OBLIGATOIRE ici, pas une optimisation : le type par défaut de
# Proxmox (kvm64) n'expose pas les jeux d'instructions modernes du processeur
# hôte. Le binaire natif de Claude Code (celui embarqué aussi dans l'appli
# desktop) part alors dans une boucle à 100 % de CPU et ne rend jamais la main
# — y compris sur un simple `claude --version`. Symptôme trompeur : `node`
# fonctionne normalement, car le Node de Debian est compilé pour un x86-64
# basique et Claude Code n'utilise pas ce Node à l'exécution.
qm create "$VMID" \
  --name "$VMNAME" \
  --memory "$MEMORY_MB" \
  --cores "$CORES" \
  --cpu host \
  --net0 "virtio,bridge=${BRIDGE}" \
  --agent enabled=1

echo "== Import du disque cloud =="
qm importdisk "$VMID" "${IMG_DIR}/${IMG_FILE}" "$STORAGE"

echo "== Attache du disque + lecteur cloud-init =="
qm set "$VMID" --scsihw virtio-scsi-pci --scsi0 "${STORAGE}:vm-${VMID}-disk-0"
qm set "$VMID" --ide2 "${STORAGE}:cloudinit"
qm set "$VMID" --boot c --bootdisk scsi0

echo "== Redimensionnement du disque à ${DISK_SIZE} =="
qm resize "$VMID" scsi0 "$DISK_SIZE"

echo "== Configuration cloud-init (utilisateur, mot de passe, clé SSH, DHCP) =="
qm set "$VMID" \
  --ciuser "$CI_USER" \
  --cipassword "$CI_PASSWORD" \
  --sshkeys "$SSH_PUBKEY" \
  --ipconfig0 ip=dhcp

echo "== Démarrage de la VM =="
qm start "$VMID"

echo
echo "VM $VMID démarrée. Récupère son IP dans quelques secondes avec :"
echo "  qm guest cmd $VMID network-get-interfaces"
echo "(nécessite l'agent invité, déjà activé — laisse 30-60s le temps que cloud-init termine)"
echo
echo "Connecte-toi ensuite en SSH : ssh ${CI_USER}@<IP-de-la-VM>"
echo "Puis lance le script 02-setup-vm.sh à l'intérieur de la VM."
