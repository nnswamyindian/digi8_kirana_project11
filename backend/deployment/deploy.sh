#!/usr/bin/env bash
# ==============================================================================
# Kirana SaaS Platform — Zero-Downtime Hostinger VPS Deployment Script
# ==============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/grocery-platform}"
echo "🚀 [Deploy] Initiating deployment in $APP_DIR at $(date -u +"%Y-%m-%dT%H:%M:%SZ")..."

if [ ! -d "$APP_DIR" ]; then
  echo "❌ [Deploy Error] Application directory $APP_DIR does not exist."
  exit 1
fi

cd "$APP_DIR"

# 1. Fetch latest changes from Git
echo "📥 [Deploy] Fetching latest changes from Git (origin/main)..."
git fetch origin main
git reset --hard origin/main

# 2. Install production dependencies
echo "📦 [Deploy] Installing dependencies with npm ci..."
npm ci --prefer-offline

# 3. Build frontend bundle
echo "🏗️ [Deploy] Building frontend production bundle..."
npm run build

# 4. Run schema migrations
echo "🗄️ [Deploy] Checking schema migrations..."
if [ -f ".env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

if [ -f "database/schema.sql" ] && [ "${DB_CLIENT:-mysql}" = "mysql" ]; then
  echo "Applying MySQL schema updates if needed..."
  if [ -n "${DB_PASSWORD:-}" ]; then
    MYSQL_PWD="${DB_PASSWORD}" mysql -u "${DB_USER:-kirana_admin}" -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" "${DB_NAME:-kirana_saas_db}" < database/schema.sql || true
  fi
fi

# 5. Reload backend PM2 cluster (Zero-Downtime)
echo "🔄 [Deploy] Reloading backend PM2 cluster..."
if pm2 describe kirana-saas-backend > /dev/null 2>&1; then
  pm2 reload deployment/pm2/ecosystem.config.cjs --env production --update-env
else
  pm2 start deployment/pm2/ecosystem.config.cjs --env production
fi
pm2 save

# 6. Test and Reload Nginx
echo "🌐 [Deploy] Verifying and reloading Nginx..."
if command -v nginx > /dev/null 2>&1; then
  sudo nginx -t && sudo systemctl reload nginx
fi

# 7. Post-Deployment Smoke Health Check
echo "🩺 [Deploy] Verifying post-deployment health check..."
HEALTH_URL="http://127.0.0.1:5000/api/platform/health"
MAX_RETRIES=10
RETRY_DELAY=2
HEALTH_PASSED=false

for i in $(seq 1 $MAX_RETRIES); do
  echo "   Attempt $i/$MAX_RETRIES: Probing $HEALTH_URL..."
  if curl -sSf "$HEALTH_URL" > /dev/null 2>&1; then
    HEALTH_PASSED=true
    break
  fi
  sleep $RETRY_DELAY
done

if [ "$HEALTH_PASSED" = true ]; then
  echo "✅ [Deploy] Health check passed successfully! Platform is LIVE and healthy."
else
  echo "❌ [Deploy Warning] Health check timed out after $((MAX_RETRIES * RETRY_DELAY)) seconds."
  echo "PM2 process status:"
  pm2 status
  exit 1
fi
