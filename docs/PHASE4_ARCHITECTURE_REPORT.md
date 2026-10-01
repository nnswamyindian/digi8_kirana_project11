# Phase 4 — Multi-Tenant SaaS Architecture & Migration Report

## 1. Executive Summary & Repository Inspection

The existing Kirana Store Management & POS platform has been thoroughly inspected. The platform is currently a functional single-store system with Phase 3 Payment & Doorstep Delivery features in place. 

- **Frontend:** React 19 + TypeScript + Vite SPA (`src/`), styling with modern CSS custom properties (`src/style.css`), Lucide icons, Canvas Confetti, and custom hardware adapters (`src/services/hardware.ts`).
- **Backend:** Node.js (v22) + Express (`server/index.js`), Server-Sent Events (SSE) for real-time broadcasts, modular payment adapters (`server/payment/`), delivery service (`server/delivery/`), and notification service (`server/notifications/`).
- **Database:** SQLite (`server/kirana_central.db`) initialized via `server/db.js` with WAL mode.
- **Port Layout:** Backend running on Port `5000`, Vite dev server on Port `5173` proxying `/api` to `http://localhost:5000`.

---

## 2. Inventory of Existing System

### 2.1 Existing Database Schema (25 Tables)
1. `stores` (Store profile, branding, timing, GST, printer config)
2. `categories` (`store_id`, `name`, `slug`, `icon`, `image_url`, `sort_order`)
3. `products` (`store_id`, `category_id`, barcode, units, pricing, costs, loose flag, stock, GST)
4. `price_history` (`product_id`, `old_price`, `new_price`, `changed_by`, `reason`, `created_at`)
5. `stock_movements` (`store_id`, `product_id`, `change_qty`, `balance_qty`, `type`, `notes`)
6. `customers` (`store_id`, name, phone, credit balance, spending, order count)
7. `customer_ledger` (`customer_id`, `store_id`, debit/credit khata tracking)
8. `orders` (`store_id`, `order_number`, `invoice_number`, `order_type`, `status`, customer info, totals)
9. `order_items` (`order_id`, `product_id`, `unit_price`, `quantity`, `cost_price`, `total_price`)
10. `suppliers` (`store_id`, name, phone, company, gstin)
11. `purchases` (`store_id`, `supplier_id`, `invoice_no`, `total_cost`, `payment_status`)
12. `purchase_items` (`purchase_id`, `product_id`, `quantity`, `unit_cost`, `total_cost`)
13. `audit_logs` (`store_id`, action, entity_type, details, user_name)
14. `delivery_areas` (`store_id`, `area_name`, `pincodes`, charges, min order, ETA)
15. `users` (`store_id`, name, phone, pin, role, permissions, status, availability)
16. `payment_audits` (`order_id`, `store_id`, amount, method, paid_by)
17. `order_status_history` (`order_id`, status, notes, updated_by)
18. `payment_settings` (Razorpay credentials, UPI ID, payment methods)
19. `payment_transactions` (`order_id`, amount, method, provider, provider IDs, status)
20. `payment_webhook_events` (Razorpay webhook audit log)
21. `delivery_tracking_sessions` (`order_id`, `agent_id`, `status`, coordinates)
22. `delivery_locations` (`session_id`, `agent_id`, breadcrumb GPS trail)
23. `delivery_cash_collections` (`order_id`, `agent_id`, amount collected, cash tendered)
24. `cash_handover_sessions` (`agent_id`, expected, received, difference, approved_by)
25. `notification_events` (`store_id`, title, message, entity_type, read_status)

### 2.2 Existing APIs (73 Endpoints)
- Real-time SSE: `/api/events`
- Media Upload: `/api/upload`
- Store Profile: `GET/PUT /api/store`
- Categories: `GET/POST/PUT/DELETE /api/categories`
- Products & Barcodes: `GET/POST/PUT/DELETE /api/products`, `POST /check-barcode`, `PATCH /price`, `POST /bulk-price`
- Inventory: `GET /api/inventory`, `POST /api/inventory/adjust`
- Suppliers & Purchases: `GET/POST /api/suppliers`, `GET/POST /api/purchases`
- Orders & POS: `GET /api/orders`, `POST /api/orders/pos`, `POST /api/orders/online`, `PATCH /status`, `PATCH /payment`, `PATCH /assign-delivery`
- Delivery Areas: `GET/POST/PUT/DELETE /api/delivery-areas`, `POST /validate-pincode`
- Authentication & Staff: `POST /api/auth/login`, `GET/POST/PUT/DELETE /api/users`, `PATCH /availability`
- Customers & Khata Ledger: `GET/POST /api/customers`, `GET/POST /api/customers/:id/ledger`
- Analytics: `GET /api/reports/dashboard`
- Hardware & Printing: `GET /api/hardware/status`, `POST /api/printer/test`
- Payment Gateway & UPI: `/api/payments/razorpay/*`, `/api/payments/dynamic-qr`, `/api/payments/settings`, `/api/payments/reconciliation`
- Delivery Logistics & Tracking: `/api/delivery/cash-collection`, `/api/delivery/cash-handover`, `/api/delivery/location`, `/api/delivery/tracking/:orderId`, `/api/delivery/active-agents`
- Notifications: `GET/PATCH/POST /api/notifications`

### 2.3 Authentication Model
- Mobile Number + 4-digit Security PIN (`users` table).
- Roles: `OWNER`, `SUB_ADMIN`, `CASHIER`, `STOCK_MANAGER`, `DELIVERY_BOY`.
- Permissions: JSON array of string capabilities.

### 2.4 Payments & Delivery
- Razorpay test/live adapter with HMAC signature verification and webhook processing.
- Dynamic UPI QR with NPCI deep link generation.
- Doorstep cash collection and physical handover reconciliation.
- Geolocation tracking with active sessions and breadcrumb logging.

---

## 3. Gap Analysis: Requirements for Phase 4 SaaS

| Capability | Current State | Target Phase 4 State |
| :--- | :--- | :--- |
| **Tenant Model** | Single store (`store_royal_001`) hardcoded in places | Dynamic Multi-Tenant: Central `tenants` catalog with subdomains/slugs, status, subscription tier, isolated storage, and config |
| **Tenant Resolution** | Implicit single store | Multi-strategy resolver: Subdomain (`tenant.platform.com`), Path (`/store/slug`), Header (`X-Tenant-ID`), or Query Param |
| **Platform Administration** | No platform admin | Central `PLATFORM_ADMIN` dashboard: Store provisioning, suspension/activation, health metrics, feature flags, tenant limits |
| **Store Registration & Wizard** | Manual DB seeding | Self-serve store registration + interactive 10-step Onboarding Wizard (1/10 to 10/10) with progress tracking |
| **Store Branding** | Hardcoded green palette in CSS | Dynamic White-Label branding: CSS variables injected per tenant (primary, secondary, button colors, logo, favicon, banner) |
| **Database Architecture** | SQLite single file | Dual Driver Architecture: Enterprise MySQL 8+ connection pooling for Hostinger VPS + robust SQLite for local zero-config dev |
| **POS Item-Level Discounts** | Bill-level flat/percent discount only | Item-level discounts (FLAT & PERCENT), manual price negotiations, permission caps (Cashier 5%, Manager 20%), Manager PIN approval modal, audit logging |
| **Real-time Delivery Isolation** | Global SSE broadcast | Tenant-scoped event channels (`tenant:{tenantId}:delivery:{orderId}`) preventing cross-tenant leakage |
| **Live Map Visualizations** | Basic map modal | Interactive SVG live fleet radar for Store Owners and order tracking map with live ETA calculation for Customers |
| **Mobile Architecture** | Browser responsive web only | React Native / Expo foundation (`mobile/`) with shared types/API clients, Customer App screens, Delivery Agent App with native GPS tracking |
| **Deployment & Production** | Local npm dev | Production Hostinger VPS setup: PM2 ecosystem config, Nginx virtual host with wildcard SSL & subdomain proxying, backup scripts |

---

## 4. Migration Risks & Breaking Change Safeguards

1. **Zero Downtime / Zero Data Loss for Tenant 001:**
   - Existing data in `kirana_central.db` already has `store_id = 'store_royal_001'`.
   - We will treat `store_royal_001` as Tenant 1 ("Royal Kirana & Supermarket", slug: `royal-kirana`).
   - All existing foreign keys and relationships remain intact.
2. **Database Compatibility:**
   - Writing raw MySQL queries that break on SQLite (or vice versa) is prevented by creating an abstracted SQL Execution Layer (`execute`, `query`, `getOne`) that adapts placeholder syntax and connection pooling dynamically.
3. **Frontend API Stability:**
   - Keep `/api/*` backwards-compatible: Default to `currentTenantId` if none provided in headers so existing components continue to function without interruption.

---

## 5. Step-by-Step Implementation Roadmap

1. **Step 1:** Establish `shared/` directory (types, constants, validation schemas) and configure dual database driver (MySQL + SQLite).
2. **Step 2:** Implement Tenant Core Engine in backend (Tenants catalog, resolution middleware, tenant-scoped query helpers).
3. **Step 3:** Implement Platform Administration APIs (`/api/platform/*`) and Platform Admin frontend dashboard.
4. **Step 4:** Implement Store Registration & 10-Step Onboarding Wizard.
5. **Step 5:** Implement Dynamic Store Branding (CSS variable injection, tenant metadata).
6. **Step 6:** Implement POS Product-Level Discounts, Manual Price Overrides, Manager PIN Approval, and Audit Trail.
7. **Step 7:** Implement Tenant-Isolated Real-time Delivery WebSockets / SSE and Live Visual Tracking Maps.
8. **Step 8:** Implement Mobile Application Foundation (`mobile/`) with Expo, Customer App, Delivery Agent App with GPS simulation/tracking.
9. **Step 9:** Prepare Hostinger VPS Deployment artifacts (Nginx, PM2, MySQL schema & seeds, deployment scripts).
10. **Step 10:** Execute comprehensive end-to-end multi-tenant isolation, real-time tracking, and regression tests.
