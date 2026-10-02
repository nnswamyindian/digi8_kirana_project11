# 🛒 Digi8 Apna Kirana & Supermarket SaaS Platform

[![CI Pipeline](https://github.com/nnswamyindian/digi8_kirana_project11/actions/workflows/ci.yml/badge.svg)](https://github.com/nnswamyindian/digi8_kirana_project11/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-22%20LTS-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.3-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Dual Database](https://img.shields.io/badge/database-SQLite3%20%7C%20MySQL%208.0-orange.svg)](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/server/db.js)

Production-Ready **Multi-Tenant Kirana, Grocery, POS Billing Counter, eCommerce Storefront, and Real-Time Delivery SaaS Platform** engineered for Indian retail operations, multi-store supermarket chains, and hyper-local delivery.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Technology Stack](#-technology-stack)
3. [Login Credentials & Roles](#-login-credentials--roles)
4. [Key Features & Capabilities](#-key-features--capabilities)
5. [Quick Start & Setup](#-quick-start--setup)
6. [Testing & Quality Assurance](#-testing--quality-assurance)
7. [Docker & Containerized Deployment](#-docker--containerized-deployment)
8. [Production Deployment](#-production-deployment)

---

## 🏗️ Architecture Overview

The system uses a **Shared Database + Multi-Tenant Scoping** model with dynamic tenant isolation, tenant headers, subdomains, and custom domains.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CLIENT TIER                                           │
│  🛒 Customer Storefront (React 19)   │   💵 Cloud POS Terminal   │   📱 Expo Mobile App     │
│  🌐 Platform Super Admin Dashboard   │   🛵 Delivery Boy Portal  │   📦 Offline PWA Mode    │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ HTTP / REST / SSE / WebSockets
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│                                    GATEWAY & ROUTING                                        │
│  Nginx Reverse Proxy  │  Wildcard SSL  │  Tenant Resolver (Subdomain / Header / Query / Slug)│
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│                                    APPLICATION LAYER                                        │
│  Express 5 REST API    │   Server-Sent Events (SSE) Bus   │   Native RFC 7519 JWT Auth      │
│  Payment Service (UPI/Razorpay)   │   Live Fleet Tracking  │   Schema Migration Manager      │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│                                      DATA LAYER                                             │
│  [db.js Unified Query Engine] ───► SQLite 3 (Local Dev)  OR  MySQL 8+ (Hostinger VPS Pool)  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Vanilla CSS with custom properties & glassmorphism tokens, Lucide Icons, Canvas Confetti.
- **Backend:** Node.js (v22 LTS), Express 5, Server-Sent Events (SSE) for real-time broadcasts.
- **Authentication:** Native RFC 7519 HMAC-SHA256 JWT, Bearer Token middleware, multi-tenant role guards.
- **Databases:** Dual-engine architecture:
  - **Local Development & CI:** SQLite 3 (`kirana_central.db`) with WAL mode.
  - **Production:** MySQL 8.0+ Connection Pool with transactional row locks.
- **Migrations:** Automated, version-tracked idempotent schema migration manager (`migrationManager.js`).
- **Hardware Integration:** ESC/POS 58mm/80mm Thermal Receipt printing, USB/Bluetooth Barcode Scanners, Web Audio order chimes.
- **DevOps & Containers:** Multi-stage `Dockerfile`, `docker-compose.yml`, PM2 ecosystem cluster, Nginx reverse proxy configuration.

---

## 🔑 Login Credentials & Roles

All demo accounts come with instant pre-fill buttons on the Staff & Store login modal:

| Role | Name | Store / Tenant | Registered Mobile | PIN / Password | Scope & Permissions |
|:---|:---|:---|:---:|:---:|:---|
| **🌐 Platform Super Admin** | Platform Administrator | Global (All Stores) | `9999999999` | `9999` | SaaS Control Center, store provisioning, plan tier management, platform audit logs. |
| **👑 Store Owner** | Ramesh Patel | Apna Kirana (`store_royal_001`) | `9876543210` | `1234` | Full store control: POS terminal, inventory, purchases, khata ledger, settings. |
| **🛡️ Store Manager** | Anil Sharma | Apna Kirana (`store_royal_001`) | `9876543211` | `1234` | Inventory adjustments, purchase orders, cashier POS discount override PIN authorization. |
| **💵 Cashier** | Priya Verma | Apna Kirana (`store_royal_001`) | `9876543212` | `1234` | POS billing counter, barcode scanning, item-level discounts up to 5%, thermal receipts. |
| **🛵 Delivery Rider #1** | Ravi Kumar | Apna Kirana (`store_royal_001`) | `9876543213` | `1234` | Mobile delivery portal, active orders, live GPS route navigation, doorstep COD collection. |
| **🛵 Delivery Rider #2** | Suresh Goud | Apna Kirana (`store_royal_001`) | `9876543214` | `1234` | Secondary rider with dedicated cash reconciliation. |
| **🏪 Store Owner (Tenant 2)** | Vikram Rao | Fresh Mart (`store_fresh_002`) | `9848012345` | `1234` | Completely isolated second tenant with independent catalog, orders, and delivery zones. |
| **🛒 Registered Customer** | Sunita Verma | Storefront | `9811223344` | `1234` | Customer account, order history tracking, saved addresses, profile management. |

---

## ✨ Key Features & Capabilities

1. **Customer Storefront:**
   - Responsive multi-tenant catalog with brand theming (dynamic primary/secondary colors).
   - Loose product weight selector (e.g., 250g, 500g, 1kg loose dals, rice, spices).
   - Real-time cart drawer, address auto-detection, delivery radius validation.
   - Dynamic UPI QR codes (BharatQR/PhonePe/GPay), Razorpay test mode, Cash on Delivery (COD).
   - Customer account registration, login, and live order status tracking.

2. **Cloud POS Counter:**
   - Lightning-fast barcode scanner support (USB, Bluetooth, and device camera).
   - Weighing scale integration for loose commodities.
   - Item-level discounts with automatic Manager PIN verification if discount exceeds 5%.
   - Instant thermal receipt printing (ESC/POS 58mm/80mm) with GST breakdown and QR codes.

3. **Inventory & Purchasing:**
   - Real-time stock tracking with low-stock alerts and reorder levels.
   - Bulk price and stock editor for high-volume catalog adjustments.
   - Supplier purchase orders and inward stock receiving logs.
   - Excel/CSV bulk product import and export.

4. **Khata & Udhar Ledger:**
   - Customer credit ledger with payment history.
   - SMS/WhatsApp friendly reminders for pending balances.

5. **Fleet & Delivery Dispatch:**
   - Mobile-first Delivery Partner Portal.
   - Live GPS tracking breadcrumbs.
   - Doorstep COD collection calculator and manager cash handover workflow.

6. **SaaS Company Control Center:**
   - Merchant 10-step self-serve onboarding wizard.
   - Store application review, approval, and invoice generation.
   - Custom domain routing (`*.kirana.com` or custom CNAME) with TXT verification tokens.
   - Store suspension and re-activation with data preservation.

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js 20+ or 22+ LTS
- npm 10+

### 1. Clone & Install
```bash
git clone https://github.com/nnswamyindian/digi8_kirana_project11.git
cd digi8_kirana_project11
npm install
```

### 2. Environment Configuration
Create a `.env` file from `.env.example`:
```env
PORT=5000
NODE_ENV=development
DB_CLIENT=sqlite

# Razorpay Test Credentials (Optional)
RAZORPAY_KEY_ID=rzp_test_kirana_demo
RAZORPAY_KEY_SECRET=rzp_secret_kirana_demo_secret

# Store UPI Details
STORE_UPI_ID=apnakirana@okhdfcbank
STORE_UPI_NAME=Apna Kirana & Supermarket
```

### 3. Run Development Servers
```bash
# Starts both Express API Server (5000) and Vite Storefront (5173) concurrently
npm run dev
```

Open your browser:
- **Storefront & Login:** [http://localhost:5173/](http://localhost:5173/)
- **Backend API & Health:** [http://localhost:5000/api/platform/health](http://localhost:5000/api/platform/health)

---

## 🧪 Testing & Quality Assurance

The project features a full CI test pipeline covering unit, offline acceptance, and live multi-tenant integration tests:

```bash
# Run complete CI test pipeline
npm test

# Run TypeScript type check
npm run typecheck

# Run unit & offline acceptance test suites
npm run test:unit

# Run live multi-tenant integration test suites
npm run test:integration

# Build production bundle
npm run build
```

---

## 🐳 Docker & Containerized Deployment

Run the complete multi-tenant platform with MySQL 8.0 using Docker Compose:

```bash
# Build and run backend and MySQL database
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop containers
docker compose down
```

The containerized app exposes:
- **Web App & API:** `http://localhost:5000/`
- **Health Probe:** `http://localhost:5000/api/platform/health`

---

## 🌐 Production Deployment

- **Automated Hostinger / VPS Deployment Script:** [deployment/deploy.sh](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/deployment/deploy.sh)
- **PM2 Cluster Configuration:** [deployment/pm2/ecosystem.config.cjs](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/deployment/pm2/ecosystem.config.cjs)
- **Nginx Reverse Proxy & SSL:** [deployment/nginx/grocery-saas.conf](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/deployment/nginx/grocery-saas.conf)
- **CI/CD Pipeline Guide:** [docs/CICD_PIPELINE_GUIDE.md](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/docs/CICD_PIPELINE_GUIDE.md)
