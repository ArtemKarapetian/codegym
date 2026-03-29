#!/usr/bin/env bash
# Set up Nginx reverse proxy + HTTPS
# Usage: ./setup-nginx.sh codegym.example.com
set -euo pipefail

DOMAIN="${1:?Usage: setup-nginx.sh <domain>}"

cat > /etc/nginx/sites-available/codegym <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/codegym /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "Nginx configured for ${DOMAIN}"
echo ""
echo "Getting HTTPS certificate..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect -m "admin@${DOMAIN}" || {
  echo "Certbot failed — set up DNS A-record for ${DOMAIN} → $(curl -s ifconfig.me) first"
  echo "Then re-run: certbot --nginx -d ${DOMAIN}"
}
