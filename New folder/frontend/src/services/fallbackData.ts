import { StoreProfile, Category, Product } from '../types';

export const DEFAULT_FALLBACK_STORE: StoreProfile = {
  id: 'store_royal_001',
  name: 'Apna Kirana & Supermarket',
  slug: 'royal-kirana',
  tagline: 'Fresh Groceries • Wholesale Rates • Fast Home Delivery',
  owner_name: 'Rajesh Sharma',
  phone: '+91 98765 43210',
  email: 'store@apnakirana.in',
  address: 'Shop No. 12, Main Market Road, Sector 4, Indirapuram, Ghaziabad, UP - 201014',
  gstin: '09AAECR1234F1Z8',
  upi_id: 'apnakirana@okhdfcbank',
  currency_symbol: '₹',
  min_order_value: 199,
  delivery_charge: 30,
  free_delivery_above: 499,
  estimated_delivery_mins: '30-45 mins',
  store_status: 'OPEN',
  opening_time: '07:30',
  closing_time: '22:30',
  operating_days: 'Monday to Sunday (All 7 Days)',
  logo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  printer_width: '80mm',
  printer_connection: 'BROWSER_DIRECT',
  status: 'ACTIVE',
  is_storefront_enabled: 1,
  plan: 'GROWTH',
  cashier_max_discount: 10,
  manager_max_discount: 25,
};

export const DEFAULT_FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat_rice', name: 'Rice & Grains', slug: 'rice-grains', icon: '🌾', sort_order: 1, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat_pulses', name: 'Pulses & Dal', slug: 'pulses-dal', icon: '🥣', sort_order: 2, image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat_flours', name: 'Flours & Atta', slug: 'flours-atta', icon: '🍞', sort_order: 3, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat_oils', name: 'Cooking Oil & Ghee', slug: 'cooking-oil-ghee', icon: '🫒', sort_order: 4, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat_spices', name: 'Spices & Masala', slug: 'spices-masala', icon: '🌶️', sort_order: 5, image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat_snacks', name: 'Snacks & Biscuits', slug: 'snacks-biscuits', icon: '🍪', sort_order: 6, image_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat_dairy', name: 'Dairy & Bakery', slug: 'dairy-bakery', icon: '🥛', sort_order: 7, image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80' },
];

export const DEFAULT_FALLBACK_PRODUCTS: Product[] = ([
  {
    id: 'prod_basmati_rice',
    category_id: 'cat_rice',
    category_name: 'Rice & Grains',
    name: 'India Gate Royal Basmati Rice (Loose)',
    brand: 'India Gate',
    barcode: '8901030001015',
    unit: 'KG',
    is_loose: 1,
    purchase_cost: 72,
    selling_price: 88,
    mrp: 105,
    wholesale_price: 78,
    min_selling_price: 75,
    pos_price: 88,
    website_price: 88,
    gst_percent: 0,
    stock: 250,
    reserved_stock: 0,
    available_stock: 250,
    min_stock: 25,
    photo_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    description: 'Premium aged long grain basmati rice, loose measured by digital scale.',
    is_active: 1,
    is_visible_online: 1,
    is_pos_available: 1,
    is_featured: 1,
    is_bestseller: 1,
    is_offer: 0,
  },
  {
    id: 'prod_aashirvaad_atta',
    category_id: 'cat_flours',
    category_name: 'Flours & Atta',
    name: 'Aashirvaad Superior MP Sharbati Whole Wheat Atta 5kg',
    brand: 'Aashirvaad',
    barcode: '8901725181222',
    unit: 'PACKET',
    is_loose: 0,
    purchase_cost: 215,
    selling_price: 245,
    mrp: 275,
    wholesale_price: 230,
    min_selling_price: 220,
    pos_price: 245,
    website_price: 245,
    gst_percent: 0,
    stock: 80,
    reserved_stock: 0,
    available_stock: 80,
    min_stock: 15,
    photo_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    description: '100% pure whole wheat grain atta with dietary fiber.',
    is_active: 1,
    is_visible_online: 1,
    is_pos_available: 1,
    is_featured: 1,
    is_bestseller: 1,
    is_offer: 0,
  },
  {
    id: 'prod_toor_dal',
    category_id: 'cat_pulses',
    category_name: 'Pulses & Dal',
    name: 'Desi Toor Dal / Arhar Dal Unpolished (Loose)',
    brand: 'Farm Fresh',
    barcode: '8901030002029',
    unit: 'KG',
    is_loose: 1,
    purchase_cost: 135,
    selling_price: 155,
    mrp: 180,
    wholesale_price: 142,
    min_selling_price: 140,
    pos_price: 155,
    website_price: 155,
    gst_percent: 0,
    stock: 120,
    reserved_stock: 0,
    available_stock: 120,
    min_stock: 20,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
    description: 'Clean unpolished high protein Desi Toor Dal.',
    is_active: 1,
    is_visible_online: 1,
    is_pos_available: 1,
    is_featured: 0,
    is_bestseller: 0,
    is_offer: 1,
  },
  {
    id: 'prod_fortune_oil',
    category_id: 'cat_oils',
    category_name: 'Cooking Oil & Ghee',
    name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
    brand: 'Fortune',
    barcode: '8906007280014',
    unit: 'LITRE',
    is_loose: 0,
    purchase_cost: 118,
    selling_price: 132,
    mrp: 155,
    wholesale_price: 124,
    min_selling_price: 122,
    pos_price: 132,
    website_price: 132,
    gst_percent: 5,
    stock: 100,
    reserved_stock: 0,
    available_stock: 100,
    min_stock: 20,
    photo_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
    description: 'Enriched with Vitamin A and Vitamin D for healthy cooking.',
    is_active: 1,
    is_visible_online: 1,
    is_pos_available: 1,
    is_featured: 1,
    is_bestseller: 1,
    is_offer: 0,
  }
] as any) as Product[];

export interface FallbackDemoUserRecord {
  phone: string;
  pin: string;
  user: import('../types').User;
}

export const DEFAULT_FALLBACK_USERS: FallbackDemoUserRecord[] = [
  {
    phone: '9999999999',
    pin: '9999',
    user: {
      id: 'usr_superadmin_001',
      name: 'Platform Root Admin',
      phone: '9999999999',
      mobile: '9999999999',
      role: 'PLATFORM_ADMIN',
      permissions: ['*'],
      status: 'ACTIVE',
      is_active: 1
    }
  },
  {
    phone: '9876543210',
    pin: '1234',
    user: {
      id: 'usr_owner_royal_001',
      store_id: 'store_royal_001',
      tenant_id: 'store_royal_001',
      name: 'Rajesh Sharma (Owner)',
      phone: '9876543210',
      mobile: '9876543210',
      role: 'OWNER',
      permissions: ['*'],
      status: 'ACTIVE',
      is_active: 1
    }
  },
  {
    phone: '9848012345',
    pin: '1234',
    user: {
      id: 'usr_owner_freshmart_002',
      store_id: 'store_freshmart_002',
      tenant_id: 'store_freshmart_002',
      name: 'Suresh Babu (Owner)',
      phone: '9848012345',
      mobile: '9848012345',
      role: 'OWNER',
      permissions: ['*'],
      status: 'ACTIVE',
      is_active: 1
    }
  },
  {
    phone: '9876543212',
    pin: '1234',
    user: {
      id: 'usr_cashier_001',
      store_id: 'store_royal_001',
      tenant_id: 'store_royal_001',
      name: 'Pooja Sharma (Cashier)',
      phone: '9876543212',
      mobile: '9876543212',
      role: 'CASHIER',
      permissions: ['pos_billing', 'view_orders', 'manage_customers'],
      status: 'ACTIVE',
      is_active: 1
    }
  },
  {
    phone: '9876543211',
    pin: '1234',
    user: {
      id: 'usr_manager_001',
      store_id: 'store_royal_001',
      tenant_id: 'store_royal_001',
      name: 'Venkatesh Rao (Store Manager)',
      phone: '9876543211',
      mobile: '9876543211',
      role: 'STOCK_MANAGER',
      permissions: ['manage_products', 'manage_stock', 'manage_orders', 'view_reports', 'manage_prices'],
      status: 'ACTIVE',
      is_active: 1
    }
  },
  {
    phone: '9876543213',
    pin: '1234',
    user: {
      id: 'usr_rider_001',
      store_id: 'store_royal_001',
      tenant_id: 'store_royal_001',
      name: 'Ravi Teja (Delivery Partner)',
      phone: '9876543213',
      mobile: '9876543213',
      role: 'DELIVERY_BOY',
      permissions: ['view_delivery', 'update_delivery_status', 'mark_cod_paid'],
      status: 'ACTIVE',
      is_active: 1,
      availability: 'ONLINE',
      availability_status: 'ONLINE'
    }
  }
];

export function getFallbackDemoUser(rawPhone: string, rawPin?: string): import('../types').User | null {
  const cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
  const cleanPin = (rawPin || '').trim();

  const match = DEFAULT_FALLBACK_USERS.find(u => {
    if (u.phone !== cleanPhone) return false;
    if (cleanPin && u.pin !== cleanPin) return false;
    return true;
  });

  return match ? { ...match.user } : null;
}
