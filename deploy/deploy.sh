#!/usr/bin/env bash
# Deploy from local machine to VPS
# Usage: ./deploy/deploy.sh <vps-ip> [ssh-user]
set -euo pipefail

VPS_HOST="${1:?Usage: deploy.sh <vps-ip> [ssh-user]}"
SSH_USER="${2:-root}"
REMOTE="$SSH_USER@$VPS_HOST"
APP_DIR="/opt/codegym"

echo "=== Building ==="
npm run build

echo "=== Deploying to ${REMOTE}:${APP_DIR} ==="

# Upload built artifacts
rsync -azP --delete \
  dist/ \
  "${REMOTE}:${APP_DIR}/dist/"

# server-bundle.mjs is already in dist/

# Upload migrations
rsync -azP \
  server/db/migrations/ \
  "${REMOTE}:${APP_DIR}/server/db/migrations/"

# Upload deploy scripts
rsync -azP \
  deploy/ \
  "${REMOTE}:${APP_DIR}/deploy/"

# Upload package.json (for installing native deps on server)
scp package.json package-lock.json "${REMOTE}:${APP_DIR}/"

# Install only production native deps on server
ssh "$REMOTE" "cd ${APP_DIR} && npm install --omit=dev better-sqlite3 bcryptjs 2>/dev/null"

# Upload .env if it doesn't exist on server
ssh "$REMOTE" "test -f ${APP_DIR}/.env || echo 'PORT=3001
JWT_SECRET=$(openssl rand -hex 32)
DB_PATH=${APP_DIR}/data/codegym.db
NODE_ENV=production
S3_BUCKET=
S3_ENDPOINT=https://storage.yandexcloud.net' > ${APP_DIR}/.env"

# Fix permissions
ssh "$REMOTE" "chown -R codegym:codegym ${APP_DIR} && chmod +x ${APP_DIR}/deploy/*.sh"

# Install and start systemd services
ssh "$REMOTE" "cp ${APP_DIR}/deploy/codegym.service /etc/systemd/system/ && \
  cp ${APP_DIR}/deploy/codegym-backup.service /etc/systemd/system/ && \
  cp ${APP_DIR}/deploy/codegym-backup.timer /etc/systemd/system/ && \
  systemctl daemon-reload && \
  systemctl enable --now codegym && \
  systemctl enable --now codegym-backup.timer"

echo ""
echo "=== Deploy complete ==="
echo "App: http://${VPS_HOST}:3001"
echo ""
echo "Useful commands:"
echo "  ssh ${REMOTE} systemctl status codegym"
echo "  ssh ${REMOTE} journalctl -u codegym -f"
echo "  ssh ${REMOTE} systemctl restart codegym"
