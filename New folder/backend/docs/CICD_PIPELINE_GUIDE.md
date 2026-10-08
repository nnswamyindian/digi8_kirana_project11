# Kirana SaaS Platform — CI/CD Pipeline & Automated Deployment Guide

## 1. Overview & Architecture

The Kirana SaaS Platform features an automated, enterprise-grade Continuous Integration and Continuous Deployment (CI/CD) pipeline built with **GitHub Actions**, **PM2**, and **Hostinger VPS (Ubuntu / Nginx / MySQL)**.

```
       [Developer Push / Pull Request to main/develop]
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    CI PIPELINE (ci.yml)                      │
│                                                              │
│  1. Code Quality & Typecheck (TypeScript compiler check)    │
│  2. Security Vulnerability Scan (npm audit)                  │
│  3. Dual-Engine Test Matrix (Node 20.x, 22.x LTS)            │
│     - Stage 1: Unit & Offline Acceptance (SQLite)            │
│     - Stage 2: Live Multi-Tenant Integration Tests           │
│     - Stage 3: MySQL 8.0 Schema Compatibility Check         │
│  4. Production Bundle Compilation (Vite build)               │
│  5. Build Artifact Upload (dist/ artifact for inspection)    │
└──────────────────────────────┬───────────────────────────────┘
                               │
                CI Passed & Branch is 'main'
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    CD PIPELINE (deploy.yml)                  │
│                                                              │
│  1. Validate Secrets (Hostinger SSH, Host, User, Key)        │
│  2. Connect to Hostinger VPS via Encrypted SSH               │
│  3. Pull Latest Git Commits (git reset --hard origin/main)   │
│  4. Install Production Dependencies (npm ci --prefer-offline)│
│  5. Build Production Frontend (npm run build)                │
│  6. Apply Database Migrations (database/schema.sql)          │
│  7. Zero-Downtime Reload via PM2 Cluster                     │
│  8. Validate & Reload Nginx Reverse Proxy                   │
│  9. Automated Post-Deployment Smoke Health Verification      │
│ 10. Generate Deployment Summary Report in GitHub Actions     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. GitHub Actions Workflows

### 2.1 Continuous Integration (`.github/workflows/ci.yml`)
- **Triggers:**
  - `push` to `main` and `develop`
  - `pull_request` targeting `main` and `develop`
  - Manual trigger via `workflow_dispatch`
- **Jobs:**
  1. `typecheck-and-lint`: Runs `npm run typecheck` to verify that there are no TypeScript syntax or typing errors. Runs non-blocking `npm audit`.
  2. `test-suite`: Runs across Node.js versions `20.x` and `22.x` with a dedicated MySQL 8.0 service container.
     - Runs `npm run test:unit` (offline unit & acceptance tests).
     - Runs `npm run test:integration` (spawns live backend, verifies health, executes isolation and multi-tenant test suites).
     - Validates MySQL 8.0 schema and seed compatibility.
  3. `build-production-bundle`: Runs `npm run build` and uploads the compiled production `dist/` directory as a downloadable workflow artifact.

### 2.2 Continuous Deployment (`.github/workflows/deploy.yml`)
- **Triggers:**
  - Automatically upon successful completion of the CI pipeline on the `main` branch.
  - Manually via `workflow_dispatch` (allows selecting `production` or `staging` environment).
- **Concurrency Control:** `group: deployment-production` with `cancel-in-progress: false` ensures that multiple deployments cannot run concurrently and corrupt the deployment directory.
- **Safety Checks:** Automatically verifies `/api/platform/health` over 12 retry cycles after reloading PM2. If the health probe fails, it dumps the PM2 error logs and halts the workflow.

### 2.3 Docker Container Packaging (`.github/workflows/docker-publish.yml`)
- Triggers on git release tags (e.g. `v1.0.0`) or manual trigger.
- Builds the multi-stage `Dockerfile` and publishes the image to GitHub Container Registry (`ghcr.io`).

---

## 3. GitHub Secrets Configuration

To enable automated deployments to your Hostinger VPS, add the following secrets to your GitHub repository:

> Navigate to: **GitHub Repository ➔ Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**

| Secret Name | Description | Example / Default |
|---|---|---|
| `HOSTINGER_SSH_HOST` | Hostinger VPS IP Address or Domain | `185.199.108.153` or `vps.yourdomain.com` |
| `HOSTINGER_SSH_USER` | VPS SSH Username | `root` or `kirana_deploy` |
| `HOSTINGER_SSH_KEY` | Private SSH Key (`id_rsa` or `id_ed25519`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `HOSTINGER_SSH_PORT` | SSH Port (default is 22) | `22` |
| `APP_DIR` | Directory on VPS where app is cloned | `/var/www/grocery-platform` (default) |

---

## 4. SSH Key Setup for VPS Deployment

To generate a dedicated deployment SSH key pair on your local machine or server:

```bash
# 1. Generate an Ed25519 SSH key pair (without passphrase for CI)
ssh-keygen -t ed25519 -C "github-actions-deploy@kirana-platform" -f ~/.ssh/kirana_deploy_key

# 2. Copy the public key to your Hostinger VPS
ssh-copy-id -i ~/.ssh/kirana_deploy_key.pub root@<YOUR_VPS_IP>

# Alternatively, manually paste contents of ~/.ssh/kirana_deploy_key.pub into
# /root/.ssh/authorized_keys (or /home/<deploy_user>/.ssh/authorized_keys)

# 3. Copy the private key content to GitHub Secrets
cat ~/.ssh/kirana_deploy_key
# Paste entire block (including BEGIN and END headers) into HOSTINGER_SSH_KEY in GitHub Secrets
```

---

## 5. Local CLI Commands

Before committing and pushing your code, you can run any of the pipeline steps locally:

```bash
# 1. Typecheck TypeScript Code
npm run typecheck

# 2. Run All Unit & Acceptance Tests (Offline)
npm run test:unit

# 3. Run Live Multi-Tenant Integration Tests (Starts temporary test server)
npm run test:integration

# 4. Run the Full Test Suite (Unit + Integration)
npm test

# 5. Build Production Frontend Bundle
npm run build
```

---

## 6. Docker & Containerized Deployment (Alternative)

If you choose to run the platform in containers:

```bash
# Build and start both app and MySQL 8.0 services
docker compose up -d --build

# View container logs
docker compose logs -f app

# Run health check probe
curl http://localhost:5000/api/platform/health

# Stop containers
docker compose down
```

---

## 7. Rollback Procedure

In the rare event that a deployment introduces an unexpected issue:

1. **Immediate Rollback on VPS:**
   ```bash
   cd /var/www/grocery-platform
   # Roll back to the previous commit
   git reset --hard HEAD@{1}
   npm ci --prefer-offline
   npm run build
   pm2 reload deployment/pm2/ecosystem.config.cjs --env production
   ```
2. **Rollback via Git:**
   ```bash
   # Revert the faulty commit on main
   git revert <commit-sha>
   git push origin main
   # The CI/CD pipeline will automatically build and deploy the reverted code.
   ```
