#!/usr/bin/env bash
# ==============================================================================
# Kirana SaaS Platform — Zero-Downtime Hostinger VPS Deployment Script
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/grocery-platform"
echo "🚀 [Deploy] Initiating deployment in $APP_DIR..."

cd "$APP_DIR"

echo "📥 [Deploy] Fetching latest changes from Git..."
git pull origin main

echo "📦 [Deploy] Installing production dependencies..."
npm ci --prefer-offline

echo "🏗️ [Deploy] Building frontend production bundle..."
npm run build

echo "🗄️ [Deploy] Running schema migrations & seeds..."
if [ -f "database/schema.sql" ] && [ "${DB_CLIENT:-mysql}" = "mysql" ]; then
  echo "Applying MySQL schema updates..."
  mysql -u "${DB_USER:-kirana_admin}" -p"${DB_PASSWORD}" "${DB_NAME:-kirana_saas_db}" < database/schema.sql || true
fi

echo "🔄 [Deploy] Reloading backend PM2 cluster..."
pm2 reload deployment/pm2/ecosystem.config.cjs --env production --update-env

echo "🌐 [Deploy] Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ [Deploy] Deployment completed successfully! Platform is LIVE."
