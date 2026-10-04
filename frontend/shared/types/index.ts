// Shared Data Models & Contracts for Multi-Tenant Kirana SaaS Platform

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';

export type TenantPlan = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';

export interface TenantBranding {
  logo_url: string;
  favicon_url?: string;
  banner_url?: string;
  primary_color: string;       // e.g. #16a34a (green), #2563eb (blue), #ea580c (orange)
  secondary_color: string;     // e.g. #0f766e
  button_color?: string;       // Accent / CTA color
  tagline?: string;
  font_family?: string;
}

export interface TenantSettings {
  currency_symbol: string;
  min_order_value: number;
  delivery_charge: number;
  free_delivery_above: number;
  estimated_delivery_mins: string;
  store_status: 'OPEN' | 'CLOSED';
  opening_time: string;
  closing_time: string;
  operating_days: string;
  printer_width: '58mm' | '80mm';
  printer_connection: 'BROWSER_DIRECT' | 'PRINT_BRIDGE';
  delivery_tracking_enabled: boolean;
  online_store_enabled: boolean;
  cod_enabled: boolean;
  upi_enabled: boolean;
  razorpay_enabled: boolean;
  cashier_max_discount_percent: number; // default 5%
  manager_max_discount_percent: number; // default 20%
}

export interface Tenant {
  id: string; // e.g. "store_royal_001"
  name: string;
  slug: string; // e.g. "royal-kirana" -> accessed via subdomain "royal-kirana.platform.com" or path "/store/royal-kirana"
  custom_domain?: string | null; // e.g. "www.royalkirana.com"
  owner_name: string;
  owner_email?: string;
  owner_phone: string;
  email?: string;
  phone?: string;
  primary_color?: string;
  business_type?: string;
  gstin?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: TenantStatus;
  plan: TenantPlan;
  plan_expires_at?: string;
  branding: TenantBranding;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

// User Roles across the Multi-Tenant Platform
export type SaaSUserRole =
  | 'PLATFORM_ADMIN'
  | 'STORE_OWNER'
  | 'STORE_ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'INVENTORY_MANAGER'
  | 'DELIVERY_AGENT'
  | 'CUSTOMER';

// Item-Level Discount Definitions for POS Billing
export type DiscountType = 'NONE' | 'FIXED' | 'PERCENT';

export type DiscountReason =
  | 'CUSTOMER_NEGOTIATION'
  | 'DAMAGED_PACKAGING'
  | 'BULK_PURCHASE'
  | 'LOYAL_CUSTOMER'
  | 'PROMOTIONAL_DISCOUNT'
  | 'CLEARANCE'
  | 'MANAGER_DISCRETION'
  | 'OTHER';

export interface ManagerDiscountApproval {
  requested_by_id: string;
  requested_by_name: string;
  approved_by_id: string;
  approved_by_name: string;
  discount_amount: number;
  discount_percent: number;
  reason: DiscountReason;
  notes?: string;
  approved_at: string;
}

export interface POSOrderItemDetail {
  product_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;              // Standard retail/POS catalog price
  cost_price: number;              // Purchase cost
  gross_amount: number;            // unit_price * quantity
  discount_type: DiscountType;     // FIXED or PERCENT
  discount_value: number;          // e.g. 50 (for ₹50) or 10 (for 10%)
  discount_amount: number;         // Total calculated line discount in ₹
  taxable_amount: number;          // gross_amount - discount_amount
  gst_percent: number;
  tax_amount: number;              // (taxable_amount * gst_percent) / 100
  final_amount: number;            // taxable_amount + tax_amount
  manual_price_adjusted?: boolean; // Whether cashier negotiated/adjusted price
  original_unit_price?: number;    // Stored to maintain historical integrity
  discount_reason?: DiscountReason;
  approval?: ManagerDiscountApproval;
}

// Real-Time Delivery Tracking Event Contracts
export interface LiveAgentLocationPayload {
  tenant_id: string;
  agent_id: string;
  agent_name: string;
  order_id?: string;
  order_number?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  channel: string; // e.g. "tenant:store_royal_001:delivery:ord_123"
}

// Platform Administrator Overview Stats
export interface PlatformAdminStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_gmv: number;
  total_orders: number;
  today_orders?: number;
  total_registered_users: number;
  plan_distribution: Record<TenantPlan, number>;
  recent_stores: Tenant[];
  system_health: {
    database: 'UP' | 'DOWN';
    database_type: 'MYSQL' | 'SQLITE';
    active_connections: number;
    memory_usage_mb: number;
    uptime_seconds: number;
  };
}

// 10-Step Store Onboarding Wizard Payload
export interface StoreOnboardingData {
  // Step 1: Basic Info
  store_name: string;
  slug: string;
  tagline: string;
  business_type: string;
  
  // Step 2: Branding Assets
  logo_url: string;
  banner_url?: string;
  
  // Step 3: Brand Colors
  primary_color: string;
  secondary_color: string;
  button_color: string;
  
  // Step 4: Address & Geography
  address: string;
  city: string;
  state: string;
  pincode: string;
  
  // Step 5: Business Credentials
  owner_name: string;
  phone: string;
  email: string;
  pin: string; // Master owner PIN
  gstin?: string;
  
  // Step 6: Payment Configuration
  upi_id: string;
  upi_name: string;
  cod_enabled: boolean;
  razorpay_enabled: boolean;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  
  // Step 7: Delivery Configuration
  delivery_charge: number;
  min_order_value: number;
  free_delivery_above: number;
  estimated_delivery_mins: string;
  
  // Step 8: Initial Category
  initial_category_name: string;
  
  // Step 9: First Product
  initial_product?: {
    name: string;
    unit: string;
    selling_price: number;
    mrp: number;
    purchase_cost: number;
    stock: number;
    barcode?: string;
  };
  
  // Step 10: Staff / Cashier
  initial_staff?: {
    name: string;
    phone: string;
    pin: string;
    role: SaaSUserRole;
  };
}
