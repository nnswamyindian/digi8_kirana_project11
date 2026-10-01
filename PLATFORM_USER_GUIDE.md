# 📖 Multi-Tenant Kirana & Grocery SaaS Platform — User Guide & Technical Manual

Welcome to the **Production Multi-Tenant Kirana & Grocery Store Management, Cloud POS Billing, eCommerce Storefront, and Real-Time Delivery SaaS Platform**. This system is specifically architected for Indian retail operations, modern omnichannel commerce, and multi-store franchise management.

---

## 🏗️ 1. System Overview & Technology Stack

The platform is designed with a **Shared Database + Shared Tables + Multi-Tenant Scoping** architecture with progressive offline support and dual database engines.

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

### Core Technology Stack

| Layer | Technologies & Libraries | Key References |
|:---|:---|:---|
| **Frontend Web & POS** | React 19, TypeScript, Vite, Vanilla CSS with CSS Custom Properties, Lucide Icons, Canvas Confetti | [App.tsx](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/src/App.tsx), [style.css](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/src/style.css) |
| **PWA & Offline Resilience** | Service Worker (`sw.js`), Web App Manifest (`manifest.json`), Offline Local Queue Engine | [sw.js](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/public/sw.js), [offlineSync.ts](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/src/services/offlineSync.ts) |
| **Backend API Server** | Node.js (v22), Express 5, Server-Sent Events (SSE) | [index.js](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/server/index.js) |
| **Authentication & RBAC** | Native RFC 7519 HMAC-SHA256 JWT, Bearer Token Middleware, Role Guards | [tokenService.js](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/server/auth/tokenService.js), [authMiddleware.js](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/server/auth/authMiddleware.js) |
| **Database Architecture** | Dual Engine: SQLite 3 (`kirana_central.db`) + Enterprise MySQL 8+ Connection Pool | [db.js](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/server/db.js), [schema.sql](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/database/schema.sql) |
| **Schema Migrations** | Automated, version-tracked idempotent migration engine | [migrationManager.js](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/server/migrations/migrationManager.js) |
| **Mobile Application** | React Native, Expo 51, Expo Location (GPS), Expo Notifications, Secure Store | [mobile/App.tsx](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/mobile/App.tsx), [mobile/package.json](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/mobile/package.json) |
| **Hardware & Peripherals** | ESC/POS Thermal Printing (58mm/80mm), USB/BT Barcode Scanners, Web Audio Chimes | [hardware.ts](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/src/services/hardware.ts) |
| **Production DevOps** | PM2 Process Manager Cluster, Nginx Reverse Proxy, Wildcard SSL, Automated Deploy Bash Script | [ecosystem.config.cjs](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/deployment/pm2/ecosystem.config.cjs), [grocery-saas.conf](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/deployment/nginx/grocery-saas.conf) |

---

## 🌐 2. System URLs & Access Endpoints

| Component | URL | Notes |
|:---|:---|:---|
| **Customer Storefront & Staff Gateway** | `http://localhost:5173/` | Public shopping, checkout, and staff login gateway |
| **Backend REST & SSE API** | `http://localhost:5000/api` | REST endpoints and real-time Server-Sent Events |
| **System Health Check** | `http://localhost:5000/api/platform/health` | Live DB status, memory metrics, driver type, uptime |
| **Platform SaaS Stats** | `http://localhost:5000/api/platform/stats` | Aggregated GMV, total stores, orders, and plan tier breakdown |
| **Service Worker & Manifest** | `http://localhost:5173/sw.js` & `/manifest.json` | Progressive Web App installable assets |

---

## 🔑 3. Logins & Credentials Reference

Authentication uses **Registered Mobile Number + 4-digit Security PIN**. On successful authentication, the server returns an **RFC 7519 compliant signed JWT token**, automatically stored in `localStorage` and injected into the `Authorization: Bearer <token>` header for all subsequent API requests.

| Role | Name / Title | Tenant / Store | Registered Mobile | Security PIN | Access Level & Permissions |
|:---|:---|:---|:---:|:---:|:---|
| **🌐 Platform Super Admin** | Platform Administrator | Global (All Tenants) | `9999999999` | `9999` | **Full Platform Control:** Provision stores, view all-store GMV, suspend/activate stores, change subscription tiers, view platform audit logs. |
| **👑 Store Owner (001)** | Ramesh Patel | Apna Kirana & Supermarket (`store_royal_001`) | `9876543210` | `1234` | **Full Store Control:** POS billing, manager discount overrides (>5%), inventory, purchasing, staff, printer, UPI/Razorpay settings, Khata ledger. |
| **🛡️ Store Manager / Sub-Admin** | Anil Sharma | Apna Kirana & Supermarket (`store_royal_001`) | `9876543211` | `1234` | **Store Management:** Inventory adjustments, supplier purchases, manager PIN authorization for cashier POS discounts, order dispatch. |
| **💵 Cashier** | Priya Verma | Apna Kirana & Supermarket (`store_royal_001`) | `9876543212` | `1234` | **POS Billing Counter:** Barcode scanning, customer phone lookup, cash/UPI billing, item discounts up to 5% (prompts Manager PIN if >5%). |
| **🛵 Delivery Rider #1** | Ravi Kumar | Apna Kirana & Supermarket (`store_royal_001`) | `9876543213` | `1234` | **Mobile Delivery Portal:** View assigned deliveries, navigation, status updates (`OUT_FOR_DELIVERY` ➔ `DELIVERED`), doorstep COD cash collection. |
| **🛵 Delivery Rider #2** | Suresh Goud | Apna Kirana & Supermarket (`store_royal_001`) | `9876543214` | `1234` | **Mobile Delivery Portal:** Second active delivery rider with independent cash collection tracking. |
| **🏪 Store Owner (002)** | Vikram Rao | Fresh Mart Superstore (`store_fresh_002`) | `9848012345` | `1234` | **Tenant 2 Owner (Blue Branding):** Completely isolated catalog, separate Hitec City delivery zones, independent UPI and revenue reporting. |
| **✨ Registered Tenant Owner** | Royal Star | New Store (`store_uz9ef9b`) | `9666252024` | `1111` | **Custom Tenant:** Created via self-serve onboarding wizard with custom branding and catalog. |
| **🛒 Online Shopper / Customer** | Public Shopper | Any Storefront | *No PIN needed* | *No PIN needed* | Browse catalog, select loose item weights, add to cart, check delivery radius, order via COD/UPI/Card, live GPS tracking. |

---

## 🚪 4. Access Procedures (Step-by-Step)

### Procedure A: Platform Super Admin Login
1. Open `http://localhost:5173/`.
2. Click **"Store Login"** in the top-right navbar.
3. Click the preset button **`🌐 Platform Admin`** (populates `9999999999` / `9999`).
4. Click **"Sign In"**.
5. You are redirected directly to the **Platform Admin Portal** (`adminTab: 'platform'`), where you can:
   - View aggregate metrics: Total Platform GMV, Total Orders, Active Stores, Suspended Stores.
   - Inspect Subscription Plan breakdown (FREE, STARTER, GROWTH, PRO, ENTERPRISE).
   - Suspend or Activate any tenant instantly with 1 click.
   - Upgrade or Downgrade store subscription tiers.
   - Inspect the real-time SaaS Security & Audit Log.

---

### Procedure B: Store Owner / Manager / Cashier Login
1. Go to `http://localhost:5173/`.
2. Click **"Store Login"** in the top-right navbar.
3. Select your desired demo role button:
   - **`👑 Royal Kirana`** (Owner: `9876543210` / `1234`)
   - **`🏪 Fresh Mart Owner`** (Tenant 002: `9848012345` / `1234`)
   - **`🛡️ Store Manager`** (Manager: `9876543211` / `1234`)
   - **`💵 Cashier`** (Cashier: `9876543212` / `1234`)
4. Click **"Sign In"**.
5. You enter the **Admin & POS Dashboard**:
   - The left sidebar provides access to all store modules.
   - The top header has a **Store Switcher dropdown** allowing you to switch between stores on the fly.
   - To return to the customer storefront anytime, click **"Customer Website"** in the sidebar.

---

### Procedure C: Delivery Rider Portal Login
1. Click **"Store Login"** on the storefront.
2. Click the preset button **`🛵 Delivery Rider`** (Phone: `9876543213` / `1234`).
3. Click **"Sign In"**.
4. The system automatically launches the **Mobile Delivery Partner Portal**:
   - Shows active assigned delivery orders.
   - Customer name, address, and Google Maps callout.
   - Order status action buttons: **"Start Delivery"** ➔ **"Mark Delivered"**.
   - Doorstep COD Cash Collection calculator.
   - End-of-shift cash handover button.
   - Online / Offline availability toggle.

---

### Procedure D: Self-Serve Store Registration & 10-Step Onboarding
1. On the customer storefront, click **"✨ Register Store"** (or click **"+ Store"** in the Admin Header).
2. The **Interactive 10-Step Onboarding Wizard (`1/10` to `10/10`)** opens:
   - **Step 1:** Store Identity (Business Name, Slug, Category)
   - **Step 2:** Media Assets (Logo URL, Store Banner)
   - **Step 3:** Brand Colors (Interactive Primary, Secondary, Button color pickers with real-time preview)
   - **Step 4:** Physical Address (Shop address, City, Pincode)
   - **Step 5:** Legal & Tax (GSTIN, FSSAI registration)
   - **Step 6:** Payment Gateways (Store UPI ID, Cash on Delivery, Razorpay keys)
   - **Step 7:** Delivery Settings (Delivery charge, Free delivery minimum, Estimated delivery time)
   - **Step 8:** First Category (e.g., Staples, Snacks, Dairy)
   - **Step 9:** First Product (Name, unit, purchase cost, selling price, barcode)
   - **Step 10:** Staff Credentials & Launch (Owner sets Cashier name, phone & PIN, then clicks Launch with celebratory confetti).
3. The store is immediately provisioned, isolated, and active with its own brand theme!

---

## 🔄 5. End-to-End Operational Workflows

### Flow 1: In-Store POS Billing with Item-Level Discount & Manager PIN
1. Log in as **Cashier** (`9876543212` / `1234`) or **Owner** (`9876543210` / `1234`).
2. Click **"POS Billing"** in the sidebar.
3. Add products to the bill via barcode scanner simulation, search bar, or category buttons.
4. On any cart item, click the **`% Discount`** badge:
   - **Flat Discount (₹):** Enter amount (e.g. ₹10 off).
   - **Percentage Discount (%):** Enter discount % (e.g. 5% off).
   - **Direct Price Negotiation:** Directly edit the unit selling price.
5. **Enforcement Limit:**
   - If discount is **≤ 5%**, it applies immediately under cashier privileges.
   - If discount is **> 5%**, an amber alert appears stating *"Manager PIN Approval Required (Cashier Limit: 5%)"*.
   - A modal prompts for the **Manager PIN**. Enter `1234` (Store Owner/Manager) or `9999` (Platform Admin).
   - Once verified, the discount is stamped with authorizing manager metadata and reason.
6. Select Payment Method (**Cash**, **Store UPI QR**, **Khata Credit / Udhar**, or **Card**).
7. Click **"Complete Sale"**:
   - Physical stock is decremented immediately.
   - Thermal invoice receipt generates with itemized discounts and savings summary.
   - Server validates the entire calculation authoritatively.

---

### Flow 2: Offline-First POS Resilience (No Internet / Network Dropouts)
1. If the internet drops midway during store hours or checkout:
   - The top banner automatically updates to **"🟠 Offline Mode"**.
   - Cashiers can continue barcode scanning, loose weighing, and billing customers without interruption.
2. When the cashier clicks **"Complete Sale"**:
   - The system detects the network outage, generates an **`OFFLINE-XXXX`** invoice, and prints the thermal receipt.
   - The transaction is safely queued in local storage via [offlineSync.ts](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/src/services/offlineSync.ts).
3. As soon as the internet connection restores:
   - The offline manager automatically flushes the queue, syncs pending transactions with the central server, and reconciles stock levels.
   - Cashiers can also click **"Sync Now"** at any time.

---

### Flow 3: Online Customer Order to Doorstep Delivery
1. Open the storefront as a customer (`http://localhost:5173/`).
2. Filter by category, or click **"Loose (Per KG)"** to order weighed staples (e.g. 500g Toor Dal).
3. Click **"Cart"** ➔ **"Proceed to Checkout"**.
4. Enter Name, Phone number, and Delivery Address.
5. Select Payment Method:
   - **Cash on Delivery (COD)**
   - **Direct UPI QR** (generates NPCI dynamic QR code)
   - **Online Razorpay**
6. Click **"Place Order"**:
   - Order chime sound triggers on all active store owner dashboards via Server-Sent Events (SSE).
   - Customer receives Order ID (e.g. `#POS-1019`) and can click **"Track Order"** at any time.
7. Store Admin opens **"Orders"**:
   - Accepts order and assigns to **Delivery Rider (Ravi Kumar)**.
8. Rider logs in on the **Delivery Portal**:
   - Sees the order, taps **"Out for Delivery"**.
   - Arrives at doorstep, collects cash, and records exact amount collected.
   - Taps **"Mark Delivered"**.
9. Store Admin views **"Payments & Handover"**:
   - Sees the collected cash under Rider Ravi's session and approves the physical cash handover.

---

### Flow 4: Platform Admin Tenant Management & Suspension
1. Log in with Platform Admin credentials (`9999999999` / `9999`).
2. Go to **"SaaS Platform Admin"** tab.
3. Review the store directory:
   - To suspend a store (e.g., non-payment or audit violation): Click the **"Suspend"** button next to that tenant.
   - Instantly, any customer visiting that store's URL or staff trying to access that store is blocked by the **Store Suspended Screen**.
4. To restore service: Click **"Activate"** in the Platform Admin dashboard; service is immediately restored with zero data loss.
5. Change plans: Click the Plan badge to upgrade from **FREE** ➔ **GROWTH** ➔ **PRO**.

---

## 🌟 6. Complete Module Inventory

### 🖥️ A. Customer Storefront
- **White-Label Dynamic Theme:** Automatically applies the store's primary, secondary, and button colors, logo, and title.
- **Packaged & Loose Groceries:** Special weight selector modal for grains, pulses, and dry fruits (sold by 250g, 500g, 1kg, 2kg, 5kg).
- **Instant Product Search:** Live autocomplete search across product names, brands, and barcodes.
- **Dynamic Delivery Rules:** Validates delivery pincodes, enforces minimum order thresholds, and calculates free delivery progress.
- **Multi-Gateway Checkout:** Supports Cash on Delivery, NPCI Dynamic UPI QR, and Razorpay.
- **Visual Order Tracking:** Live status timeline, estimated delivery time countdown, and simulated rider transit.

### 💼 B. POS Terminal & Retail Counter
- **Rapid Item Scanning:** Supports physical USB/Bluetooth barcode scanners and manual barcode entry.
- **Loose Item Weighing Scale:** Calculates dynamic prices by weight (KG/Grams).
- **Line-Item Discounts:** Flat ₹, percentage %, and negotiated prices with cashier 5% permission limit and Manager PIN override modal.
- **Customer Khata / Udhar:** Lookup customer by phone, view credit balance, and bill directly against their ledger.
- **Thermal Receipt Printing:** ESC/POS formatting with store header, GST numbers, savings breakdown, and customizable 58mm/80mm widths.
- **Offline Billing Resilience:** Offline bill queueing, receipt generation, and auto-sync on reconnect.

### 📦 C. Inventory & Supplier Master
- **Multi-Price Architecture:** Maintains distinct Wholesale Price, Minimum Selling Price, POS Price, and Website Price per product.
- **Stock Movement Ledger:** Complete audit trail tracking sales, returns, supplier purchases, and manual adjustments.
- **Low-Stock Alerts:** Amber/red warnings when items drop below minimum safety stock levels.
- **Barcode Generator:** Generates EAN-13 barcodes and printable barcode label sheets.

### 🚚 D. Delivery & Logistics Hub
- **Delivery Zone Radius:** Set delivery fees, minimum orders, and estimated delivery times per pincode zone.
- **Live Fleet Radar:** Real-time SVG dashboard showing all active riders, availability, and active delivery transit.
- **Doorstep COD Reconciliation:** Enforces cash tracking with tamper-proof delivery cash collection and manager handover sessions.

### ⚙️ E. Platform Administration & Security
- **Tenant Isolation:** Every order, product, customer, and transaction is strictly isolated by `tenant_id`.
- **Global Financial Visibility:** Cross-tenant GMV, transaction volume, and active subscriber metrics.
- **Subdomain Routing & Custom Domains:** Supports `tenant.domain.com` or custom domains via Nginx reverse proxy.
- **JWT Security & Token Hydration:** Standard RFC 7519 HMAC-SHA256 token verification with timing-safe comparison.
- **Comprehensive Audit Logs:** Tracks logins, price modifications, manager discount approvals, and store configuration changes.

---

## 📱 7. Mobile Application Architecture (`mobile/`)

The mobile companion app is located in [`mobile/`](file:///c:/Users/nnswa/OneDrive/Desktop/ROYAL_PROJECTS/kiranastoresystem/mobile) (React Native + Expo 51):
- **Customer App (`CustomerAppScreen.tsx`):** Native shopping experience with instant cart management and order tracking.
- **Rider App (`DeliveryAgentAppScreen.tsx`):** Optimized for delivery personnel with turn-by-turn order details, GPS location pings (`expo-location`), and COD cash entry.
- **Deep Linking:** Configured with `kirana://store/{slug}` for direct store launches.

---

## 🛠️ 8. Command Reference & Test Suites

| Task | Command | Description |
|:---|:---|:---|
| **Start Local Development** | `npm run dev` | Concurrently launches backend on `:5000` and Vite client on `:5173` |
| **Start Backend Server Only** | `npm run server` | Launches Express server with `.env` environment configuration |
| **Start Frontend Client Only** | `npm run client` | Launches Vite HMR development server |
| **Build Frontend Bundle** | `npm run build` | Compiles production assets into `dist/` |
| **Production Recommendations Test** | `node test_recommendations_jwt_offline.js` | Validates JWT token creation/tampering, DB migrations, and session hydration |
| **Phase 3 Acceptance Test** | `node test_phase3_acceptance.js` | Validates UPI QR, Razorpay HMAC, order lifecycle, delivery GPS, and cash handover |
| **Phase 4 Multi-Tenant Test** | `node test_phase4_multi_tenant.cjs` | Validates tenant isolation, store onboarding, POS item discounts, and audit logs |
| **Phase 5 SaaS Control Center Test** | `node test_phase5_saas_control.js` | Validates 10-step SaaS lifecycle: application, approval, subscription payment, activation, custom domain, and helpdesk |
| **System Health Check** | `curl http://localhost:5000/api/platform/health` | Inspects database driver (SQLite/MySQL), memory usage, and uptime |
| **Hostinger VPS Deploy** | `bash deployment/deploy.sh` | Automated zero-downtime deployment script with PM2 and Nginx reload |

---

## 🏢 9. Phase 5 — SaaS Company Control Center, Store Approval, Payment, White-Label & Custom Domain

Phase 5 equips the platform owner with an enterprise-grade SaaS operational center. Our company operates the SaaS platform, selling subscription tiers to independent Kirana and supermarket retailers while preserving 100% tenant isolation, dynamic custom domain routing, and strict financial separation.

### 🔄 The Complete SaaS Merchant Lifecycle

```text
       PUBLIC SAAS LANDING PAGE (http://localhost:5173/?view=landing)
                                  ↓
                        STORE REGISTRATION
            (Store Name, Owner, Phone, Plan, Address, GST)
                                  ↓
                        STATUS: UNDER_REVIEW
             (Tenant & User created with status: 'PENDING')
                                  ↓
                   COMPANY ADMIN CONTROL CENTER
             (Review credentials, check serviceable zone)
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
                 REJECT                      APPROVE
          (Provides feedback)                   ↓
                                        STATUS: PAYMENT_PENDING
                                        (Generates Tax Invoice)
                                                ↓
                                      MERCHANT PAYS PLATFORM
                                 (Store ➔ Company Subscription)
                                                ↓
                                      PAYMENT VERIFICATION
                                (Automated Webhook / Callback)
                                                ↓
                                       STORE ACTIVATION
                                    (tenant.status = 'ACTIVE')
                                                ↓
                                       STORE OWNER LOGIN
                               (Command Center & POS Unlocked)
                                                ↓
                                      WHITE-LABEL BRANDING
                              (Custom Colors, Logo, Tagline, Banners)
                                                ↓
                                      CUSTOM DOMAIN SETUP
                               (CNAME: stores.platform.com + TXT Token)
                                                ↓
                                       DNS & SSL VERIFIED
                               (Zero-config HTTPS Certificate)
                                                ↓
                                      STORE 100% LIVE
```

---

### 💳 Strict Financial Separation: Platform Revenue vs Store Sales

A foundational architectural principle enforced in Phase 5:
- **Platform SaaS Subscription Revenue (`platform_subscriptions`, `platform_invoices`, `platform_subscription_payments`):**
  - Store pays our company for SaaS software access (e.g. ₹2,499/month + ₹2,499 setup fee).
  - Tax invoices are issued from *Digi8Solutions Pvt Ltd* directly to the merchant.
- **Store Retail Customer Revenue (`orders`, `payments`, `cash_handover_sessions`):**
  - End shoppers pay the Kirana store for groceries (e.g. ₹850 for rice and dal).
  - Funds flow directly into the store owner's bank account via direct UPI or merchant Razorpay account.
  - **These two payment systems NEVER mix.**

---

### 🎛️ Company Control Center Modules (`adminTab='platform'`)

Located under the **Company Control Center** tab (or via admin subdomain):

1. **Executive Overview & KPI Dashboard:**
   - Total registered stores, Active stores, Pending applications, Payment pending, Suspended tenants.
   - Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), and today's subscription collections.
   - System telemetry status (Database engine, Multi-tenant reverse proxy, Real-time WebSockets bus).
2. **Store Applications Pipeline:**
   - Real-time queue filtered by `PENDING`, `UNDER_REVIEW`, `APPROVED`, `PAYMENT_PENDING`, `REJECTED`.
   - Inspection modal showing store address, owner phone, email, GSTIN, and requested tier.
   - 1-Click `Approve & Request Payment` or `Reject` actions.
3. **Active Stores Directory (360° Management):**
   - Live searchable registry of all stores.
   - Change subscription plans, toggle feature overrides, suspend for terms violation, or activate.
   - Instant "Manage Store" action to simulate tenant context without credentials.
4. **Subscription Plans & Dynamic DB Pricing (`subscription_plans`):**
   - Prices and features are **never hardcoded** in the platform.
   - Configurable limits: `Starter Kirana` (₹999/mo, 1000 products), `Professional Supermarket` (₹2,499/mo, 5000 products, Custom Domain), `Business Superstore` (₹4,999/mo), and `Enterprise Multi-Store` (Custom).
5. **Platform Billing & SaaS Tax Invoices (`platform_invoices`):**
   - Complete ledger of store-to-company transactions.
   - Printable GST invoices with tax breakdown.
6. **Custom Domain Multi-Tenant Routing (`tenant_domains`):**
   - Platform-wide custom domain manager.
   - Live DNS verification status and automated SSL certificate monitoring.
7. **Support Helpdesk (`support_tickets`):**
   - Centralized ticketing system for merchant questions regarding hardware, POS billing, and custom domains.
   - Company staff can write direct responses and transition tickets to `IN_PROGRESS` or `RESOLVED`.
8. **Administrative Audit Trail (`audit_logs`):**
   - Tamper-evident log of all company administrative actions, tenant suspensions, plan upgrades, and domain verifications.

---

### 🌐 Custom Domain Architecture & Dynamic Tenant Resolution

Merchants can connect their own branded domain (e.g., `www.royalkirana.com`):
- **DNS Setup:**
  - `CNAME` Host `www` (or subdomain) pointing to `stores.kirana-saas.com`.
  - `TXT` Record with Name `_platform-verification` and Value `tok_verify_XXXXX`.
- **Dynamic Resolution (`tenantMiddleware.js`):**
  - Incoming requests parse the `Host`, `X-Forwarded-Host`, or `X-Custom-Domain` header.
  - The middleware performs a single indexed query against `tenant_domains` (`verification_status = 'VERIFIED' AND ssl_status = 'ACTIVE'`).
  - The single, shared React frontend dynamically re-skins the entire store with the tenant's brand colors, logo, and product catalog.

---

### 🏪 Store Owner Command Center Additions

Store owners now have access to three new dedicated portal sections:
- **Custom Domain (`adminTab='domains'`):** Step-by-step DNS instruction table, 1-click "Verify DNS Now" button, and active HTTPS badge.
- **Plan & Billing (`adminTab='subscription'`):** View active tier, next renewal date, usage quota meters (products used vs max limit, staff accounts, delivery fleet), plan upgrade modal, and downloadable tax invoices.
- **Help & Support (`adminTab='support'`):** Direct communication desk with platform engineers with category and priority selection.

---

### Designed & Built by [Digi8Solutions](https://digi8solutions.com)
*Enterprise Multi-Tenant SaaS Platform for Indian Kirana & Modern Supermarkets.*

