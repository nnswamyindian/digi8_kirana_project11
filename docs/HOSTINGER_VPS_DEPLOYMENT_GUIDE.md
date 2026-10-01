# Hostinger VPS Production Deployment Guide & SaaS Operations Runbook

## 1. Multi-Tenant Architecture Overview
The platform operates on a single codebase with shared tables and strict `tenant_id` isolation.

- **Architecture:** `ONE PLATFORM + ONE FRONTEND + ONE BACKEND + ONE DATABASE SERVER + MULTIPLE STORES`
- **Isolation Principle:** Every table (`products`, `categories`, `orders`, `order_items`, `customers`, `users`, `payments`, `delivery_agents`) includes an indexed `tenant_id` column.
- **Tenant Context Resolution:** Resolves via subdomain (`store1.platform.com`), path (`/store/:slug`), or header (`x-tenant-id`).
- **Database Engine:** Dual-Engine architecture supporting **MySQL 8.0+** with connection pooling (`mysql2`) in production and **SQLite3** in local development.

---

## 2. Server Prerequisites (Hostinger VPS)
- **OS:** Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- **RAM:** Minimum 2GB (4GB recommended for PM2 cluster + MySQL)
- **Node.js:** v20.x or v22.x LTS
- **Database:** MySQL 8.0+
- **Reverse Proxy:** Nginx with Let's Encrypt Wildcard SSL
- **Process Manager:** PM2

---

## 3. Step-by-Step VPS Setup

### Step 1: System Packages & Node.js
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx build-essential ufw

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### Step 2: MySQL 8.0 Installation & Hardening
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Create Dedicated Database & Dedicated User (Do NOT use root!)
sudo mysql -u root -p
```
```sql
CREATE DATABASE kirana_saas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kirana_admin'@'localhost' IDENTIFIED BY 'StrongPasswordHere_1234!';
GRANT ALL PRIVILEGES ON kirana_saas_db.* TO 'kirana_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Clone Codebase to Production Directory
```bash
sudo mkdir -p /var/www/grocery-platform
sudo chown -y $USER:$USER /var/www/grocery-platform
cd /var/www/grocery-platform

git clone https://github.com/your-username/kiranastoresystem.git .
npm ci --prefer-offline
```

### Step 4: Import Database Schema & Seeds
```bash
mysql -u kirana_admin -p kirana_saas_db < database/schema.sql
mysql -u kirana_admin -p kirana_saas_db < database/seed.sql
```

### Step 5: Configure Production Environment (`.env.production`)
Create `.env.production` in `/var/www/grocery-platform/`:
```env
PORT=5000
NODE_ENV=production
DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=kirana_saas_db
DB_USER=kirana_admin
DB_PASSWORD=StrongPasswordHere_1234!
JWT_SECRET=super_secret_jwt_key_here_change_in_production
VITE_API_URL=https://platform.com/api
```

### Step 6: Build Frontend Production Assets
```bash
npm run build
# Output generated in /var/www/grocery-platform/dist
```

### Step 7: Configure Nginx & Let's Encrypt SSL
```bash
sudo cp deployment/nginx/grocery-saas.conf /etc/nginx/sites-available/grocery-saas.conf
sudo ln -s /etc/nginx/sites-available/grocery-saas.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Obtain Wildcard SSL for *.platform.com
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d platform.com -d *.platform.com -d api.platform.com

sudo nginx -t && sudo systemctl restart nginx
```

### Step 8: Start Backend with PM2 Cluster
```bash
pm2 start deployment/pm2/ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

---

## 4. Default Seeded Accounts
| Role | Store / Tenant | Mobile Login | Default PIN |
|---|---|---|---|
| **Platform SaaS Admin** | Central SaaS System | `9999999999` | `9999` |
| **Store Owner** | Tenant 001 (Royal Kirana) | `9876543210` | `1234` |
| **Store Owner** | Tenant 002 (Fresh Mart) | `9848012345` | `1234` |
| **Delivery Rider** | Tenant 001 | `9848011223` | `1234` |

---

## 5. POS Product Discounts & Cashier Permissions
1. **Item-Level Discounts:** Cashiers can apply flat or percentage discounts per item, or adjust prices based on customer negotiation.
2. **5% Permission Limit:** If discount on any line item exceeds 5%, the terminal prompts for **Manager Approval PIN**.
3. **Audit Trail:** Discount reasons, original prices, applied reductions, and authorizing manager IDs are logged to `audit_logs` and `order_items`.

---

## 6. Real-Time Delivery Tracking Verification
1. Delivery Agent opens Mobile Rider portal and taps **Start Transit GPS**.
2. GPS coordinates transmit over tenant-isolated channels: `tenant:${tenantId}:delivery:${orderId}`.
3. Live dashboard updates marker positions dynamically with zero page reloads.
4. Tenant A riders are strictly isolated from Tenant B dashboards.
