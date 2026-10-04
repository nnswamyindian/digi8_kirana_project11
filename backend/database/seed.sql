-- ====================================================================
-- KIRANA SAAS PLATFORM - MULTI-TENANT SEED DATA
-- Includes Tenant 001 (Royal Kirana), Tenant 002 (Fresh Mart), and Platform Admin
-- ====================================================================

-- 1. SEED TENANT 001 (Royal Kirana)
INSERT INTO tenants (
  id, name, slug, owner_name, owner_email, owner_phone, business_type, gstin,
  address, city, state, pincode, status, plan, primary_color, secondary_color, button_color,
  logo_url, tagline, min_order_value, delivery_charge, free_delivery_above, estimated_delivery_mins
) VALUES (
  'store_royal_001', 'Apna Kirana & Supermarket', 'royal-kirana', 'Ramesh Patel', 'ramesh@apnakirana.com', '9876543210',
  'RETAIL_GROCERY', '36AABCU9603R1ZM', 'Shop #4, Main Market, Kukatpally', 'Hyderabad', 'Telangana', '500072',
  'ACTIVE', 'GROWTH', '#16a34a', '#0f766e', '#15803d',
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=200&q=80',
  'Pure, Fresh & Honest Grocery Essentials Daily', 199.00, 30.00, 499.00, '30-45 mins'
) ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. SEED TENANT 002 (Fresh Mart - Blue Branding)
INSERT INTO tenants (
  id, name, slug, owner_name, owner_email, owner_phone, business_type, gstin,
  address, city, state, pincode, status, plan, primary_color, secondary_color, button_color,
  logo_url, tagline, min_order_value, delivery_charge, free_delivery_above, estimated_delivery_mins
) VALUES (
  'store_fresh_002', 'Fresh Mart Superstore', 'fresh-mart', 'Vikram Rao', 'vikram@freshmart.com', '9848012345',
  'SUPERMARKET', '36AAECR5512M1Z8', 'G-12, Cyber Gateway, Madhapur', 'Hyderabad', 'Telangana', '500081',
  'ACTIVE', 'PRO', '#2563eb', '#1d4ed8', '#1e40af',
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=200&q=80',
  'Smart Living, Freshest Groceries Delivered in 20 Mins', 149.00, 25.00, 399.00, '20-35 mins'
) ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. SEED PLATFORM ADMIN & TENANT USERS
INSERT INTO users (
  id, tenant_id, name, phone, pin, role, permissions, status, availability
) VALUES 
('usr_superadmin', NULL, 'Platform Super Admin', '9999999999', '9999', 'PLATFORM_ADMIN', '["*"]', 'ACTIVE', 'ONLINE'),
('usr_owner', 'store_royal_001', 'Ramesh Patel (Owner)', '9876543210', '1234', 'STORE_OWNER', '["*"]', 'ACTIVE', 'ONLINE'),
('usr_fresh_owner', 'store_fresh_002', 'Vikram Rao (Owner)', '9848012345', '1234', 'STORE_OWNER', '["*"]', 'ACTIVE', 'ONLINE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. SEED PAYMENT SETTINGS PER TENANT
INSERT INTO payment_settings (
  id, tenant_id, razorpay_enabled, razorpay_test_mode, razorpay_key_id, razorpay_key_secret,
  store_upi_id, store_upi_name, cod_enabled, online_payment_enabled
) VALUES 
('pay_royal_001', 'store_royal_001', 1, 1, 'rzp_test_kirana_demo', 'rzp_secret_kirana_demo_secret', 'apnakirana@okhdfcbank', 'Apna Kirana & Supermarket', 1, 1),
('pay_fresh_002', 'store_fresh_002', 1, 1, 'rzp_test_freshmart_demo', 'rzp_secret_freshmart_demo_secret', 'freshmart@oksbi', 'Fresh Mart Superstore', 1, 1)
ON DUPLICATE KEY UPDATE store_upi_id=VALUES(store_upi_id);
