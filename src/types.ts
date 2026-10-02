export * from '../shared/types';
export * from '../shared/constants';
export * from '../shared/validation';

export interface StoreProfile {
  id: string;
  name: string;
  slug?: string;
  custom_domain?: string;
  tagline: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  upi_id: string;
  currency_symbol: string;
  min_order_value: number;
  delivery_charge: number;
  free_delivery_above: number;
  estimated_delivery_mins: string;
  store_status: 'OPEN' | 'CLOSED';
  opening_time: string;
  closing_time: string;
  operating_days: string;
  logo_url: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  button_color?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';
  is_storefront_enabled?: number | boolean;
  plan?: 'FREE' | 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
  printer_width: '58mm' | '80mm';
  printer_connection: 'BROWSER_DIRECT' | 'PRINT_BRIDGE';
  cashier_max_discount?: number;
  manager_max_discount?: number;
  city?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  store_id?: string;
  name: string;
  slug: string;
  icon: string;
  image_url: string;
  sort_order: number;
  product_count?: number;
}

export interface Product {
  id: string;
  store_id?: string;
  tenant_id?: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  name: string;
  brand: string;
  barcode: string;
  sku?: string;
  unit: 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'PACKET' | 'BOX' | 'PIECE' | 'DOZEN' | 'BOTTLE' | 'BAG' | 'BUNDLE' | string;
  is_loose: number | boolean;
  purchase_cost: number;
  selling_price: number;
  mrp: number;
  wholesale_price: number;
  min_selling_price: number;
  default_discount_type?: 'NONE' | 'FIXED' | 'PERCENT';
  default_discount_value?: number;
  pos_price: number;
  website_price: number;
  gst_percent: number;
  stock: number;
  stock_quantity?: number;
  reserved_stock: number;
  available_stock: number;
  min_stock: number;
  max_stock?: number;
  reorder_level?: number;
  supplier?: string;
  hsn_sac?: string;
  barcode_type?: 'MANUFACTURER' | 'INTERNAL_STORE';
  is_in_stock?: boolean;
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  is_active: number | boolean;
  is_visible_online: number | boolean;
  is_pos_available: number | boolean;
  is_featured: number | boolean;
  is_bestseller: number | boolean;
  is_offer: number | boolean;
  photo_url: string;
  description: string;
  savings_amount?: number;
  savings_percent?: number;
  expected_profit?: number;
  profit_margin?: number;
  markup_percent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  changed_by: string;
  reason: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  total_price: number;
}

export interface DeliveryArea {
  id: string | number;
  store_id?: string;
  area_name: string;
  pincodes: string;
  delivery_charge: number;
  free_delivery_above?: number;
  min_order_value?: number;
  min_order_amount?: number;
  estimated_delivery?: string;
  estimated_delivery_time?: string;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'OWNER' | 'SUB_ADMIN' | 'CASHIER' | 'STOCK_MANAGER' | 'DELIVERY_BOY' | 'DELIVERY_AGENT' | 'PLATFORM_ADMIN';

export type UserPermission =
  | '*'
  | 'view_orders'
  | 'manage_orders'
  | 'manage_products'
  | 'manage_stock'
  | 'manage_customers'
  | 'manage_delivery'
  | 'assign_delivery_boys'
  | 'view_reports'
  | 'manage_discounts'
  | 'manage_prices'
  | 'manage_users'
  | 'manage_delivery_areas'
  | 'mark_cod_paid'
  | 'pos_billing'
  | 'view_delivery'
  | 'update_delivery_status';

export interface User {
  id: string | number;
  store_id?: string;
  tenant_id?: string;
  name: string;
  phone?: string;
  mobile?: string;
  pin?: string;
  role: UserRole;
  permissions: UserPermission[] | string[];
  photo_url?: string;
  address?: string;
  emergency_contact?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  is_active?: number | boolean;
  availability?: 'ONLINE' | 'OFFLINE' | 'BUSY';
  availability_status?: 'ONLINE' | 'OFFLINE' | 'BUSY';
  created_at?: string;
  updated_at?: string;
}

export interface PaymentAudit {
  id: string;
  order_id: string;
  store_id: string;
  amount: number;
  payment_method: string;
  paid_by_user_id?: string;
  paid_by_user_name: string;
  notes?: string;
  created_at: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  status: string;
  payment_status?: string;
  notes: string;
  updated_by: string;
  created_at: string;
}

export type OrderStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'PARTIALLY_PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';

export interface Order {
  id: string;
  store_id: string;
  order_number: string;
  invoice_number: string;
  order_type: 'POS' | 'ONLINE_DELIVERY' | 'ONLINE_PICKUP';
  status: OrderStatus;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_area_id?: string;
  area?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  assigned_delivery_boy_id?: string;
  assigned_delivery_boy_name?: string;
  pickup_code?: string;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  gst_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT' | 'COD' | 'RAZORPAY';
  payment_transaction_id?: string;
  delivery_mode?: 'DELIVERY' | 'PICKUP';
  delivery_notes?: string;
  delivery_failure_reason?: string;
  cancellation_reason?: string;
  estimated_delivery_mins?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  status_history?: OrderStatusHistoryEntry[];
  payment_audits?: PaymentAudit[];
}

// ----------------------------------------------------
// PHASE 3: PAYMENT, CASH RECONCILIATION & TRACKING TYPES
// ----------------------------------------------------

export interface PaymentTransaction {
  id: string;
  order_id: string;
  customer_id?: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  provider_payment_id?: string;
  provider_order_id?: string;
  transaction_reference?: string;
  status: PaymentStatus;
  collected_by?: string;
  collected_by_id?: string;
  collected_at?: string;
  verified_at?: string;
  failure_reason?: string;
  metadata?: string;
  order_number?: string;
  customer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentSettings {
  id: string;
  razorpay_enabled: number | boolean;
  razorpay_test_mode: number | boolean;
  razorpay_key_id: string;
  razorpay_key_secret?: string;
  razorpay_key_secret_masked?: string;
  has_key_secret?: boolean;
  razorpay_webhook_secret?: string;
  store_upi_id: string;
  store_upi_name: string;
  store_upi_qr_url?: string;
  cod_enabled: number | boolean;
  cod_min_order: number;
  cod_max_order: number;
  online_payment_enabled: number | boolean;
  cash_enabled: number | boolean;
  upi_enabled: number | boolean;
  card_enabled: number | boolean;
  razorpay_mode?: 'TEST' | 'LIVE' | string;
  allowed_methods?: string | string[];
  upi_id?: string;
  upi_store_name?: string;
  updated_at?: string;
}

export interface InvoiceSettings {
  id?: string;
  tenant_id?: string;
  // Invoice number
  invoice_prefix: string;
  // Display toggles
  invoice_show_logo: boolean;
  invoice_show_gst: boolean;
  invoice_show_address: boolean;
  invoice_show_phone: boolean;
  invoice_show_customer_name: boolean;
  invoice_show_customer_mobile: boolean;
  invoice_show_qr: boolean;
  invoice_show_tax: boolean;
  invoice_show_discount: boolean;
  // Text customization
  invoice_footer_message: string;
  invoice_thank_you_message: string;
  // POS guard rails
  allow_selling_below_cost: boolean;
  allow_negative_inventory: boolean;
  minimum_margin_alert_percent: number;
  // WhatsApp Business API
  whatsapp_enabled: boolean;
  whatsapp_business_number: string;
  whatsapp_phone_number_id: string;
  whatsapp_account_id: string;
  whatsapp_template_name: string;
  whatsapp_auto_send: boolean;
  whatsapp_access_token_configured?: boolean; // set by server (never sent back in plain text)
  updated_at?: string;
}

export interface DeliveryCashCollection {
  id: string;
  order_id: string;
  payment_transaction_id?: string;
  agent_id: string;
  agent_name: string;
  order_total: number;
  amount_collected: number;
  customer_tendered: number;
  change_returned: number;
  currency: string;
  payment_method: string;
  collected_at: string;
  latitude?: number | null;
  longitude?: number | null;
  device_info?: string;
  notes?: string;
  handover_id?: string | null;
  handover_status: 'PENDING' | 'HANDED_OVER';
  order_number?: string;
}

export interface CashHandoverSession {
  id: string;
  agent_id: string;
  agent_name: string;
  expected_amount: number;
  received_amount: number;
  difference: number;
  orders_count: number;
  approved_by: string;
  notes?: string;
  handover_time: string;
  status: string;
}

export interface DeliveryTrackingSession {
  id: string;
  order_id: string;
  agent_id: string;
  agent_name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  started_at: string;
  ended_at?: string;
  start_lat?: number;
  start_lng?: number;
  current_lat?: number;
  current_lng?: number;
  updated_at: string;
}

export interface NotificationEvent {
  id: string;
  store_id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  read_status: number;
  is_read?: number | boolean;
  created_at: string;
}

export interface ActiveDeliveryAgent {
  id: string;
  name: string;
  phone: string;
  availability: 'ONLINE' | 'OFFLINE' | 'BUSY';
  status: string;
  photo_url?: string;
  active_orders_count: number;
  current_order_id?: string | null;
  current_order_number?: string | null;
  current_order_address?: string | null;
  pending_cash_held: number;
  current_lat?: number | null;
  current_lng?: number | null;
  location_updated_at?: string | null;
}

export interface PaymentReconciliationData {
  summary: {
    total_collected: number;
    cash: number;
    upi: number;
    razorpay: number;
    card: number;
    credit: number;
    refunded: number;
    net_revenue: number;
  };
  agent_collections: {
    agent_id: string;
    agent_name: string;
    orders_count: number;
    total_cash: number;
    pending_cash: number;
    handed_over_cash: number;
  }[];
  handovers: CashHandoverSession[];
  recent_transactions: PaymentTransaction[];
}

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  credit_balance: number;
  total_spent: number;
  orders_count: number;
  created_at?: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  store_id: string;
  type: string;
  amount: number;
  balance_after: number;
  notes: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  store_id?: string;
  name: string;
  phone: string;
  company: string;
  gstin: string;
  address: string;
}

export interface PurchaseItem {
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
  product_name?: string;
}

export interface Purchase {
  id: string;
  store_id: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_company?: string;
  invoice_no: string;
  total_cost: number;
  payment_status: string;
  notes?: string;
  created_at: string;
  items?: PurchaseItem[];
}

export interface DashboardReport {
  summary: {
    total_sales: number;
    today_sales: number;
    pos_sales: number;
    online_sales: number;
    orders_count: number;
    customers_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
  };
  payment_methods: {
    cash: number;
    upi: number;
    card: number;
    credit: number;
  };
  top_items: {
    product_name: string;
    unit: string;
    total_qty: number;
    total_revenue: number;
  }[];
}

// ----------------------------------------------------
// PHASE 6 & 6A: BULK IMPORT, INVENTORY & ANALYTICS TYPES
// ----------------------------------------------------

export interface BulkImportRow {
  rowNumber: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  subcategory?: string;
  brand?: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  wholesalePrice?: number;
  taxPercent: number;
  openingStock: number;
  minStock: number;
  maxStock?: number;
  reorderLevel?: number;
  supplier?: string;
  hsnSac?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  problems: string[];
  status_type?: 'VALID' | 'WARNING' | 'ERROR';
}

export interface BulkImportValidationResult {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  rows: BulkImportRow[];
}

export interface BulkImportConfirmResult {
  success: boolean;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit: string;
  transaction_type: 'OPENING_STOCK' | 'PURCHASE' | 'SALE' | 'SALE_REVERSAL' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE' | 'EXPIRY' | 'TRANSFER' | 'STOCK_RECEIVE';
  reference_id?: string;
  previous_stock: number;
  new_stock: number;
  unit_cost?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface InvoiceSettings {
  invoice_prefix: string;
  invoice_show_logo: boolean;
  invoice_show_gst: boolean;
  invoice_show_address: boolean;
  invoice_show_phone: boolean;
  invoice_show_customer_name: boolean;
  invoice_show_customer_mobile: boolean;
  invoice_show_qr: boolean;
  invoice_show_tax: boolean;
  invoice_show_discount: boolean;
  invoice_footer_message: string;
  invoice_thank_you_message: string;
  printer_width: '58mm' | '80mm';
  printer_connection: 'BROWSER_DIRECT' | 'PRINT_BRIDGE';
  whatsapp_enabled: boolean;
  whatsapp_business_number: string;
  whatsapp_phone_number_id: string;
  whatsapp_account_id: string;
  whatsapp_access_token_configured?: boolean;
  whatsapp_template_name: string;
  whatsapp_auto_send: boolean;
  allow_selling_below_cost: boolean;
  allow_negative_inventory: boolean;
  minimum_margin_alert_percent: number;
}

export interface DailyTrendPoint {
  date: string;
  grossSales: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  ordersCount: number;
  unitsSold: number;
}

export interface RevenueAnalyticsReport {
  period: {
    range: string;
    from: string;
    to: string;
  };
  kpis: {
    totalOrders: number;
    totalUnitsSold: number;
    grossSales: number;
    itemDiscounts: number;
    billDiscounts: number;
    totalDiscounts: number;
    totalTax: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    profitMargin: number;
    markup: number;
  };
  trend: DailyTrendPoint[];
  hourlyDistribution: { hour: number; count: number; revenue: number }[];
  channels: Record<string, number>;
  paymentMethods: Record<string, number>;
}

export interface ProductProfitabilityItem {
  productId: string;
  productName: string;
  categoryName: string;
  unit: string;
  barcode: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  currentStock: number;
  isLowMargin: boolean;
  isNegativeProfit: boolean;
}

export interface CategoryProfitabilityItem {
  categoryId: string;
  categoryName: string;
  icon: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
}

export interface InventoryValuationItem {
  id: string;
  name: string;
  brand: string;
  unit: string;
  barcode: string;
  sku: string;
  categoryName: string;
  stock: number;
  purchaseCost: number;
  sellingPrice: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  potentialMargin: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
}

export interface InventoryValuationReport {
  totalItems: number;
  totalStockQty: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialGrossProfit: number;
  potentialMargin: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: InventoryValuationItem[];
}

export interface MonthlySummaryReport {
  year: number;
  months: {
    monthNumber: number;
    monthName: string;
    grossSales: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    marginPercent: number;
    ordersCount: number;
  }[];
}

export interface CustomerUser {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  credit_balance?: number;
  total_spent?: number;
  orders_count?: number;
  created_at?: string;
}

export interface TenantResolveResult {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  button_color?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';
  is_suspended?: boolean;
  is_storefront_enabled?: boolean;
  custom_domain?: string;
  currency_symbol?: string;
  min_order_value?: number;
  delivery_charge?: number;
  free_delivery_above?: number;
  estimated_delivery_mins?: string;
  store_status?: 'OPEN' | 'CLOSED';
}


