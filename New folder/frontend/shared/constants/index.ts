// Centralized Business Constants & Permission Matrices

export const DEFAULT_TENANT_ID = 'store_royal_001';
export const DEFAULT_TENANT_SLUG = 'royal-kirana';

export const SAAS_ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  STORE_OWNER: 'STORE_OWNER',
  STORE_ADMIN: 'STORE_ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  DELIVERY_AGENT: 'DELIVERY_AGENT',
  CUSTOMER: 'CUSTOMER',
} as const;

export const DISCOUNT_LIMITS = {
  CASHIER_MAX_PERCENT: 5,   // Cashier can apply at most 5% without manager approval
  MANAGER_MAX_PERCENT: 20,  // Manager can approve up to 20%
  OWNER_MAX_PERCENT: 100,   // Owner has full discretion
};

export const DISCOUNT_REASONS = [
  { id: 'CUSTOMER_NEGOTIATION', label: 'Customer Negotiation / Bargain' },
  { id: 'BULK_PURCHASE', label: 'Bulk Purchase Volume Discount' },
  { id: 'LOYAL_CUSTOMER', label: 'Loyal Regular Customer Courtesy' },
  { id: 'DAMAGED_PACKAGING', label: 'Slightly Damaged Outer Packaging' },
  { id: 'PROMOTIONAL_DISCOUNT', label: 'Festival / Promotional Campaign' },
  { id: 'CLEARANCE', label: 'Clearance / Approaching Expiry' },
  { id: 'MANAGER_DISCRETION', label: 'Special Manager Approval' },
  { id: 'OTHER', label: 'Other Justified Reason' },
];

export const SAAS_PLANS = {
  FREE: {
    name: 'Free Starter',
    max_products: 50,
    max_staff: 2,
    max_delivery_agents: 1,
    online_orders_per_month: 100,
    custom_domain: false,
    analytics: 'BASIC',
  },
  GROWTH: {
    name: 'Growth Kirana',
    max_products: 500,
    max_staff: 5,
    max_delivery_agents: 5,
    online_orders_per_month: 1000,
    custom_domain: false,
    analytics: 'ADVANCED',
  },
  PRO: {
    name: 'Pro Supermarket',
    max_products: 5000,
    max_staff: 25,
    max_delivery_agents: 20,
    online_orders_per_month: 10000,
    custom_domain: true,
    analytics: 'ENTERPRISE',
  },
  ENTERPRISE: {
    name: 'Multi-Branch Enterprise',
    max_products: 50000,
    max_staff: 100,
    max_delivery_agents: 100,
    online_orders_per_month: 999999,
    custom_domain: true,
    analytics: 'ENTERPRISE',
  }
};
