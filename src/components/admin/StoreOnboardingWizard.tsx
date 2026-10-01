import React, { useState } from 'react';
import { api, setActiveTenantId } from '../../services/api';
import {
  Store,
  Image,
  Palette,
  MapPin,
  Briefcase,
  CreditCard,
  Truck,
  Tags,
  Package,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  X
} from 'lucide-react';

interface StoreOnboardingWizardProps {
  onClose: () => void;
  onComplete: (tenantId: string) => void;
}

export const StoreOnboardingWizard: React.FC<StoreOnboardingWizardProps> = ({
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form State across all 10 steps
  const [formData, setFormData] = useState({
    // Step 1: Store info
    store_name: '',
    owner_name: '',
    phone: '',
    email: '',
    tagline: 'Your Trusted Neighborhood Kirana',
    business_type: 'Kirana & Grocery',

    // Step 2: Logo & Visuals
    logo_url: '',
    banner_url: '',

    // Step 3: Brand Colors
    primary_color: '#059669', // Emerald
    secondary_color: '#0284c7', // Sky

    // Step 4: Address
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',

    // Step 5: Business info
    gst_number: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',

    // Step 6: Payment settings
    enable_cod: true,
    enable_upi: true,
    upi_id: '',
    enable_razorpay: false,
    razorpay_key_id: '',

    // Step 7: Delivery settings
    delivery_enabled: true,
    delivery_radius_km: 5,
    min_order_amount: 100,
    free_delivery_above: 500,

    // Step 8: First category
    category_name: 'Staples & Grains',
    category_desc: 'Rice, Atta, Dals, Spices & Cooking Oils',

    // Step 9: First product
    product_name: 'Premium Sona Masoori Rice (5kg)',
    product_price: 320,
    product_mrp: 350,
    product_stock: 40,
    product_barcode: '8901030800012',

    // Step 10: Staff & Security
    owner_pin: '1234',
    cashier_name: 'Store Cashier',
    cashier_phone: '',
    cashier_pin: '1111'
  });

  const steps = [
    { number: 1, title: 'Store Info', icon: Store },
    { number: 2, title: 'Logo', icon: Image },
    { number: 3, title: 'Brand Colors', icon: Palette },
    { number: 4, title: 'Address', icon: MapPin },
    { number: 5, title: 'Business & Tax', icon: Briefcase },
    { number: 6, title: 'Payments', icon: CreditCard },
    { number: 7, title: 'Delivery', icon: Truck },
    { number: 8, title: 'Category', icon: Tags },
    { number: 9, title: 'First Product', icon: Package },
    { number: 10, title: 'Staff & Launch', icon: UserCheck }
  ];

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!formData.store_name.trim()) return setErrorMsg('Store name is required.');
      if (!formData.owner_name.trim()) return setErrorMsg('Owner name is required.');
      if (!formData.phone.trim() || formData.phone.length < 10) return setErrorMsg('Valid 10-digit mobile number is required.');
    }
    if (currentStep === 4) {
      if (!formData.address.trim()) return setErrorMsg('Store address is required.');
      if (!formData.pincode.trim()) return setErrorMsg('PIN code is required.');
    }
    if (currentStep === 10) {
      if (!formData.owner_pin || formData.owner_pin.length < 4) return setErrorMsg('4-digit Owner PIN is required.');
    }

    if (currentStep < 10) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      // 1. Register store & create tenant
      const regResult = await api.registerStore({
        store_name: formData.store_name,
        owner_name: formData.owner_name,
        phone: formData.phone,
        email: formData.email,
        pin: formData.owner_pin,
        business_type: formData.business_type,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        gst_number: formData.gst_number
      });

      const newTenantId = regResult.tenant_id;
      setActiveTenantId(newTenantId);

      // 2. Save complete onboarding details
      await api.saveOnboardingStep({
        tenant_id: newTenantId,
        step: 10,
        step_data: formData
      });

      // 3. Create first category in new tenant
      try {
        await api.createCategory({
          name: formData.category_name,
          slug: formData.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          sort_order: 1
        });
      } catch (catErr) {
        console.warn('First category auto-creation notice:', catErr);
      }

      // 4. Create first product in new tenant
      try {
        await api.createProduct({
          name: formData.product_name,
          selling_price: Number(formData.product_price),
          mrp: Number(formData.product_mrp),
          stock_quantity: Number(formData.product_stock),
          barcode: formData.product_barcode || undefined,
          is_active: 1
        });
      } catch (prodErr) {
        console.warn('First product auto-creation notice:', prodErr);
      }

      // 5. Complete
      onComplete(newTenantId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete store onboarding');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '840px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Wizard Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, #065f46, #059669)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#6ee7b7" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Store Onboarding Wizard
              </h2>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#a7f3d0' }}>
              Step {currentStep} of 10 — {steps[currentStep - 1].title}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              {currentStep}/10
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Step Progress Stepper Bar */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', padding: '0.5rem 1rem' }}>
          {steps.map(step => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const StepIcon = step.icon;
            return (
              <div
                key={step.number}
                onClick={() => {
                  if (step.number < currentStep) setCurrentStep(step.number);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '6px',
                  cursor: isCompleted ? 'pointer' : 'default',
                  color: isCurrent ? '#059669' : isCompleted ? '#334155' : '#94a3b8',
                  fontWeight: isCurrent ? 700 : 500,
                  fontSize: '0.78rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: isCurrent ? '#059669' : isCompleted ? '#10b981' : '#e2e8f0',
                  color: isCurrent || isCompleted ? 'white' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem'
                }}>
                  {isCompleted ? '✓' : step.number}
                </div>
                <span>{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Wizard Step Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Step 1: Store Information */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 1: Store Identity</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Basic details of your retail store.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Store Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Kirana & Supermarket"
                    value={formData.store_name}
                    onChange={e => updateField('store_name', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.owner_name}
                    onChange={e => updateField('owner_name', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Owner Mobile Phone * (Login ID)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Store Email
                  </label>
                  <input
                    type="email"
                    placeholder="store@example.com"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Store Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="Fresh groceries delivered in 30 mins"
                    value={formData.tagline}
                    onChange={e => updateField('tagline', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Upload Logo */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 2: Brand Logo & Banners</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Upload or link your store logo image.</p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Logo URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={formData.logo_url}
                  onChange={e => updateField('logo_url', e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem',
                border: '2px dashed #cbd5e1',
                borderRadius: '10px',
                background: '#f8fafc'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  background: formData.primary_color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 800
                }}>
                  {formData.logo_url ? <img src={formData.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : (formData.store_name ? formData.store_name[0].toUpperCase() : '🏪')}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{formData.store_name || 'My Kirana Store'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Preview of storefront app header logo</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Brand Colors */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 3: Choose Brand Theme</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Select your storefront theme palette.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Primary Color (Buttons & Header)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={e => updateField('primary_color', e.target.value)}
                      style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={e => updateField('primary_color', e.target.value)}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Secondary Accent Color
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={e => updateField('secondary_color', e.target.value)}
                      style={{ width: '48px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={e => updateField('secondary_color', e.target.value)}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>

              {/* Color Presets */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Popular Kirana Themes:</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { name: 'Royal Emerald', primary: '#059669', secondary: '#0284c7' },
                    { name: 'Fresh Sapphire', primary: '#2563eb', secondary: '#0d9488' },
                    { name: 'Sunset Amber', primary: '#ea580c', secondary: '#eab308' },
                    { name: 'Berry Maroon', primary: '#991b1b', secondary: '#d97706' }
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        updateField('primary_color', preset.primary);
                        updateField('secondary_color', preset.secondary);
                      }}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: preset.primary }}></span>
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Store Address */}
          {currentStep === 4 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 4: Store Physical Location</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Printed on customer POS bills & receipt invoices.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Shop / Building Address *
                  </label>
                  <input
                    type="text"
                    placeholder="Plot 42, Main Road, Near Bus Stand"
                    value={formData.address}
                    onChange={e => updateField('address', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => updateField('city', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={e => updateField('state', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={e => updateField('pincode', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Business Information */}
          {currentStep === 5 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 5: Business & GST Information</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Configure legal tax details for invoice compliance.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="36ABCDE1234F1Z5"
                    value={formData.gst_number}
                    onChange={e => updateField('gst_number', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Store Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={e => updateField('currency', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="AED">AED (Dirham)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Payment Settings */}
          {currentStep === 6 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 6: Payment Gateways</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Configure merchant UPI and Cash-on-Delivery methods.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={formData.enable_cod}
                    onChange={e => updateField('enable_cod', e.target.checked)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Enable Cash on Delivery (COD)</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customers can pay cash upon doorstep delivery</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={formData.enable_upi}
                    onChange={e => updateField('enable_upi', e.target.checked)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Enable Direct UPI QR Billing</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Generate dynamic UPI QR codes directly at POS checkout</div>
                  </div>
                </label>

                {formData.enable_upi && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Store Merchant UPI VPA ID
                    </label>
                    <input
                      type="text"
                      placeholder="merchant@upi or store@okaxis"
                      value={formData.upi_id}
                      onChange={e => updateField('upi_id', e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 7: Delivery Settings */}
          {currentStep === 7 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 7: Delivery Zone Rules</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Configure delivery boundaries and minimum order thresholds.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Delivery Radius (km)
                  </label>
                  <input
                    type="number"
                    value={formData.delivery_radius_km}
                    onChange={e => updateField('delivery_radius_km', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={e => updateField('min_order_amount', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.free_delivery_above}
                    onChange={e => updateField('free_delivery_above', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 8: First Category */}
          {currentStep === 8 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 8: Create First Category</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Organize your store catalog into distinct sections.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={e => updateField('category_name', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.category_desc}
                    onChange={e => updateField('category_desc', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 9: First Product */}
          {currentStep === 9 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 9: Add First Product</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Add your first inventory item for testing POS barcode scanning.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={e => updateField('product_name', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.product_price}
                    onChange={e => updateField('product_price', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.product_mrp}
                    onChange={e => updateField('product_mrp', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Initial Stock Qty
                  </label>
                  <input
                    type="number"
                    value={formData.product_stock}
                    onChange={e => updateField('product_stock', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Barcode / EAN
                  </label>
                  <input
                    type="text"
                    value={formData.product_barcode}
                    onChange={e => updateField('product_barcode', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Staff & Security */}
          {currentStep === 10 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>Step 10: Store Credentials & Launch</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>Set your quick 4-digit security PIN for terminal login.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Owner Security PIN (4 digits) *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={formData.owner_pin}
                    onChange={e => updateField('owner_pin', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.25rem', letterSpacing: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Registered Mobile
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.phone}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#64748b' }}
                  />
                </div>
              </div>

              <div style={{
                padding: '1rem',
                borderRadius: '10px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <CheckCircle2 size={24} color="#059669" />
                <div style={{ fontSize: '0.85rem', color: '#065f46' }}>
                  <strong>Everything is ready!</strong> Clicking &quot;Finish &amp; Launch Store&quot; will provision your dedicated tenant, apply branding, generate demo catalog, and load your POS register.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: 'white',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#334155',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              opacity: currentStep === 1 ? 0.5 : 1
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {currentStep < 10 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Next Step ({currentStep + 1}/10)
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Sparkles size={18} />
                {isSubmitting ? 'Creating Tenant...' : 'Finish & Launch Store (10/10)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
