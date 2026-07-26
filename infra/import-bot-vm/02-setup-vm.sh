#!/bin/bash
# À lancer DANS la VM (après connexion SSH), une fois, en tant qu'utilisateur
# non-root créé par cloud-init (ex. "monstres"). Installe Xfce minimal +
# TigerVNC + Chrome + Node.js + Claude Code CLI.
#
# Usage : ssh monstres@<IP-VM>, puis `bash 02-setup-vm.sh`.
set -euo pipefail

echo "== Mise à jour du système =="
sudo apt-get update
sudo apt-get upgrade -y

echo "== Outils de base (absents de l'image cloud minimale) =="
sudo apt-get install -y curl gnupg ca-certificates

echo "== Bureau minimal (Xfce core, pas la suite complète xfce4-goodies) =="
sudo apt-get install -y --no-install-recommends \
  xfce4 xfce4-terminal dbus-x11 x11-xserver-utils

echo "== Serveur VNC (TigerVNC — léger) =="
sudo apt-get install -y tigervnc-standalone-server tigervnc-common

echo "== Configuration du bureau lancé par VNC =="
mkdir -p ~/.vnc
cat > ~/.vnc/xstartup <<'EOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
EOF
chmod +x ~/.vnc/xstartup

echo "== Mot de passe VNC (demandé maintenant) =="
vncpasswd

echo "== Chrome (dépôt officiel Google) =="
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | \
  sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable

echo "== Node.js LTS (dépôt NodeSource) =="
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "== Claude Code CLI =="
sudo npm install -g @anthropic-ai/claude-code

echo "== Service systemd pour le serveur VNC (persiste après reboot) =="
sudo tee /etc/systemd/system/vncserver@.service > /dev/null <<EOF
[Unit]
Description=TigerVNC server (display %i) — bureau Xfce pour la routine d'import
After=network.target

[Service]
Type=forking
User=${USER}
WorkingDirectory=${HOME}
ExecStartPre=-/usr/bin/vncserver -kill :%i
ExecStart=/usr/bin/vncserver :%i -geometry 1280x800 -localhost yes
ExecStop=/usr/bin/vncserver -kill :%i

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now vncserver@1.service

echo
echo "=================================================================="
echo "Installation terminée."
echo
echo "IMPORTANT (sécurité) : le serveur VNC n'écoute qu'en local"
echo "(-localhost yes) — accède-y uniquement via un tunnel SSH, jamais"
echo "en exposant le port VNC directement sur le réseau :"
echo
echo "  Depuis ta machine : ssh -L 5901:localhost:5901 ${USER}@<IP-VM>"
echo "  Puis connecte un client VNC (TigerVNC Viewer, RealVNC...) sur"
echo "  localhost:5901"
echo
echo "Étapes manuelles restantes (voir README.md) :"
echo "  1. Se connecter en VNC, ouvrir Chrome, se connecter à Facebook."
echo "  2. Lancer 'claude' dans un terminal Xfce, se connecter (login)."
echo "  3. Suivre le README pour relancer la routine d'import dans cette"
echo "     nouvelle session."
echo "=================================================================="
