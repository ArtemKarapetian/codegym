#!/usr/bin/env bash
# Run this on a fresh Yandex Cloud Ubuntu VPS
# Usage: ssh root@your-vps 'bash -s' < deploy/setup-server.sh
set -euo pipefail

echo "=== CodeGym VPS Setup ==="

# ── System deps ──
apt-get update -qq
apt-get install -y -qq curl sqlite3 nginx certbot python3-certbot-nginx

# ── Node.js 20 via NodeSource ──
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "Node: $(node -v)"

# ── App user ──
if ! id codegym &>/dev/null; then
  useradd -r -m -d /opt/codegym -s /bin/bash codegym
fi

# ── Directories ──
mkdir -p /opt/codegym/{data,backups,dist,deploy,server/db/migrations}
chown -R codegym:codegym /opt/codegym

# ── AWS CLI for S3 backups (Yandex Object Storage is S3-compatible) ──
if ! command -v aws &>/dev/null; then
  apt-get install -y -qq awscli
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. From your machine, run: deploy/deploy.sh your-vps-ip"
echo "  2. Configure S3 backup: aws configure --profile yandex"
echo "  3. Set S3_BUCKET in /opt/codegym/.env"
echo "  4. (Optional) Set up nginx + HTTPS with: deploy/setup-nginx.sh your-domain.com"
