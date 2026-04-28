#!/usr/bin/env bash
# YES LMS — production deploy script.
# Run from a workstation that can SSH into the VPS as root or sudo-enabled user.
#
# Usage:
#   VPS_HOST=yes-vps DOMAIN=yes.innertalk.space ./deploy/deploy.sh
#
# Expects ~/.ssh/config alias `yes-vps` (or set VPS_HOST=user@ip directly).
# Requires the .env.prod file at deploy/.env.prod (gitignored).

set -euo pipefail

VPS_HOST="${VPS_HOST:-site-vps}"
DOMAIN="${DOMAIN:-yes.innertalk.space}"
REMOTE_DIR="${REMOTE_DIR:-/opt/yes-lms}"
ENV_FILE="${ENV_FILE:-deploy/.env.prod}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy] ERROR: $ENV_FILE not found. Copy deploy/.env.prod.example and fill it in."
  exit 1
fi

echo "[deploy] Syncing repo → ${VPS_HOST}:${REMOTE_DIR}"
ssh "$VPS_HOST" "mkdir -p $REMOTE_DIR"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude 'dist' \
  --exclude '.pytest_cache' \
  --exclude 'frontend/.vite' \
  --exclude 'secondbrain/raw' \
  ./ "$VPS_HOST:$REMOTE_DIR/"

echo "[deploy] Pushing $ENV_FILE → remote .env.prod"
scp "$ENV_FILE" "$VPS_HOST:$REMOTE_DIR/deploy/.env.prod"

echo "[deploy] Building & starting containers"
ssh "$VPS_HOST" "cd $REMOTE_DIR/deploy && \
  docker compose --env-file .env.prod -f docker-compose.prod.yml build && \
  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d"

echo "[deploy] Installing nginx host config (idempotent)"
ssh "$VPS_HOST" bash -s <<EOF
set -e
sudo cp $REMOTE_DIR/deploy/nginx-host.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
EOF

echo "[deploy] Issuing/renewing Let's Encrypt cert for $DOMAIN"
ssh "$VPS_HOST" bash -s <<EOF
set -e
if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
  sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN \
    --non-interactive --agree-tos --email admin@yescenter.ru
  sudo systemctl reload nginx
else
  echo "  [+] Cert already present, skipping issue (renewal handled by certbot.timer)"
fi
EOF

echo "[deploy] Done. Check: https://$DOMAIN"
ssh "$VPS_HOST" "cd $REMOTE_DIR/deploy && docker compose -f docker-compose.prod.yml ps"
