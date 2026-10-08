import React, { useState, useEffect } from 'react';
import { StoreProfile, PaymentSettings, InvoiceSettings } from '../../types';
import { api } from '../../services/api';
import { ReceiptData, thermalPrinter, barcodeScanner, PrinterStatus } from '../../services/hardware';
import { Settings, Printer, Scale, Barcode, ShieldCheck, Check, Save, CreditCard, QrCode, Banknote, Lock, Globe, MessageSquare, Phone, Bell, Eye, EyeOff, FileText, Percent, Bluetooth, Usb, Radio, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface StoreSettingsProps {
  store: StoreProfile;
  onRefreshStore: () => void;
  onOpenReceipt: (data: ReceiptData) => void;
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  store,
  onRefreshStore,
  onOpenReceipt,
}) => {
  const [formData, setFormData] = useState<StoreProfile>({
    ...store,
    printer_width: store?.printer_width || '80mm'
  });
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentSettings>>({
    razorpay_enabled: 1,
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: '',
    razorpay_mode: 'test',
    upi_enabled: 1,
    upi_id: '',
    upi_store_name: '',
    cash_enabled: 1,
    cod_enabled: 1,
    cod_min_order: 100,
    cod_max_order: 5000,
    allowed_methods: '["RAZORPAY","UPI","CASH","COD"]'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testBarcodeText, setTestBarcodeText] = useState('');
  const [showWaToken, setShowWaToken] = useState(false);

  // Invoice & WhatsApp Settings State (Phase 6)
  const [invoiceSettings, setInvoiceSettings] = useState<Partial<InvoiceSettings>>({
    invoice_prefix: 'INV',
    invoice_show_logo: true,
    invoice_show_gst: true,
    invoice_show_address: true,
    invoice_show_phone: true,
    invoice_show_customer_name: true,
    invoice_show_customer_mobile: true,
    invoice_show_qr: true,
    invoice_show_tax: true,
    invoice_show_discount: true,
    invoice_footer_message: 'Thank you for shopping with us! Visit again.',
    invoice_thank_you_message: 'Thank you for your visit!',
    whatsapp_enabled: false,
    whatsapp_business_number: '',
    whatsapp_phone_number_id: '',
    whatsapp_account_id: '',
    whatsapp_template_name: 'kirana_invoice_notification',
    whatsapp_auto_send: false,
    allow_selling_below_cost: false,
    allow_negative_inventory: false,
    minimum_margin_alert_percent: 10,
  });
  const [isInvoiceSaving, setIsInvoiceSaving] = useState(false);
  const [invoiceSaveOk, setInvoiceSaveOk] = useState(false);

  // Live Hardware Connection States
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(thermalPrinter.getStatus());
  const [isPairingBt, setIsPairingBt] = useState(false);
  const [isConnectingUsb, setIsConnectingUsb] = useState(false);
  const [hardwareAlert, setHardwareAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api.getPaymentSettings().then(res => {
      if (res) {
        const upiVal = res.store_upi_id || res.upi_id || '';
        setPaymentForm(prev => ({
          ...prev,
          ...res,
          upi_id: upiVal,
          store_upi_id: upiVal,
          razorpay_key_secret: '', // Keep empty unless owner types a new secret
        }));
        if (upiVal) {
          setFormData(prev => ({ ...prev, upi_id: prev.upi_id || upiVal }));
        }
      }
    }).catch(console.error);

    api.getInvoiceSettings().then(res => {
      if (res) setInvoiceSettings(res);
    }).catch(console.error);

    // Subscribe to thermal printer status
    const unsubPrinter = thermalPrinter.onStatusChange((status) => {
      setPrinterStatus(status);
    });

    // Auto-capture scans from hardware barcode scanner into test bench
    barcodeScanner.connect((scannedCode) => {
      setTestBarcodeText(scannedCode);
      setHardwareAlert({
        type: 'success',
        message: `Hardware Barcode Scanner Read: ${scannedCode} (${scannedCode.length} digits)`
      });
    });

    return () => {
      unsubPrinter();
      barcodeScanner.disconnect();
    };
  }, []);

  const handleConnectBt = async () => {
    setIsPairingBt(true);
    setHardwareAlert(null);
    try {
      const res = await thermalPrinter.connectBluetooth();
      if (res.success) {
        setHardwareAlert({ type: 'success', message: `Connected to Bluetooth Printer: ${res.deviceName}` });
      } else {
        setHardwareAlert({ type: 'error', message: res.error || 'Bluetooth pairing cancelled.' });
      }
    } catch (err: any) {
      setHardwareAlert({ type: 'error', message: err.message || 'Bluetooth connection failed.' });
    } finally {
      setIsPairingBt(false);
    }
  };

  const handleConnectUsb = async () => {
    setIsConnectingUsb(true);
    setHardwareAlert(null);
    try {
      let res = await thermalPrinter.connectUsb();
      if (!res.success && printerStatus.supportsSerial) {
        res = await thermalPrinter.connectSerial(9600);
      }
      if (res.success) {
        setHardwareAlert({ type: 'success', message: `Connected to USB Printer: ${res.deviceName}` });
      } else {
        setHardwareAlert({ type: 'error', message: res.error || 'USB printer selection cancelled.' });
      }
    } catch (err: any) {
      setHardwareAlert({ type: 'error', message: err.message || 'USB printer connection failed.' });
    } finally {
      setIsConnectingUsb(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await thermalPrinter.disconnect();
    setHardwareAlert({ type: 'success', message: 'Printer disconnected. Switched to system dialog.' });
  };

  const handleDirectTestPrint = async () => {
    setHardwareAlert(null);
    const res = await thermalPrinter.testDirectPrint(formData.name);
    if (res.success) {
      setHardwareAlert({ type: 'success', message: 'Test ESC/POS receipt sent successfully!' });
    } else {
      setHardwareAlert({ type: 'error', message: res.error || 'Failed to print test receipt.' });
    }
  };

  const handleKickDrawer = async () => {
    setHardwareAlert(null);
    const res = await thermalPrinter.kickCashDrawer();
    if (res.success) {
      setHardwareAlert({ type: 'success', message: 'Cash drawer RJ11 pulse sent successfully!' });
    } else {
      setHardwareAlert({ type: 'error', message: res.error || 'Could not kick cash drawer. Connect printer first.' });
    }
  };

  const handleChange = (field: keyof StoreProfile, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handlePaymentChange = (field: keyof PaymentSettings, val: any) => {
    setPaymentForm(prev => ({ ...prev, [field]: val }));
  };

  const togglePaymentMethod = (method: string) => {
    let currentMethods: string[] = [];
    try {
      if (Array.isArray(paymentForm.allowed_methods)) {
        currentMethods = paymentForm.allowed_methods;
      } else if (typeof paymentForm.allowed_methods === 'string') {
        currentMethods = JSON.parse(paymentForm.allowed_methods || '[]');
      }
    } catch {
      currentMethods = ['RAZORPAY', 'UPI', 'CASH', 'COD'];
    }
    const updated = currentMethods.includes(method)
      ? currentMethods.filter(m => m !== method)
      : [...currentMethods, method];
    setPaymentForm(prev => ({ ...prev, allowed_methods: JSON.stringify(updated) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Immediately apply brand colors to CSS root variables for instant UI update
      if (formData.primary_color) {
        document.documentElement.style.setProperty('--primary-500', formData.primary_color);
        document.documentElement.style.setProperty('--primary-600', formData.primary_color);
      }
      if (formData.button_color) {
        document.documentElement.style.setProperty('--primary-700', formData.button_color);
      }

      // Ensure canonical UPI value is synchronized across both payload objects
      const activeUpi = formData.upi_id || paymentForm.upi_id || '';
      const storePayload = { ...formData, upi_id: activeUpi };
      const paymentPayload = { ...paymentForm, upi_id: activeUpi, store_upi_id: activeUpi };

      await Promise.all([
        api.updateStore(storePayload),
        api.updatePaymentSettings(paymentPayload)
      ]);
      setSaveSuccess(true);
      onRefreshStore();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert('Failed to save settings: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrinter = async () => {
    try {
      const res = await api.testPrinter();
      const receiptData: ReceiptData = {
        store_name: formData.name,
        store_tagline: formData.tagline,
        address: formData.address,
        phone: formData.phone,
        gstin: formData.gstin,
        invoice_no: res.data.invoice_no,
        date_time: res.data.date,
        cashier: res.data.cashier,
        customer_name: 'Test Customer',
        customer_phone: '9800000000',
        items: res.data.items.map((it: any) => ({
          name: it.name,
          qty: it.qty,
          unit: '',
          rate: parseFloat(it.rate.replace('₹', '')) || 0,
          amount: parseFloat(it.amount.replace('₹', '')) || 0,
        })),
        subtotal: parseFloat(res.data.subtotal.replace('₹', '')) || 0,
        discount: parseFloat(res.data.discount.replace('₹', '')) || 0,
        total: parseFloat(res.data.total.replace('₹', '')) || 0,
        payment_method: res.data.payment_method,
        upi_id: formData.upi_id,
        footer_text: res.data.footer,
      };

      onOpenReceipt(receiptData);
    } catch (err) {
      alert('Error testing printer: ' + err);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: '880px' }}>
      {saveSuccess && (
        <div style={{ padding: '12px 18px', background: 'var(--primary-100)', color: 'var(--primary-800)', borderRadius: 'var(--radius-md)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} />
          <span>Settings successfully saved and synchronized across storefront and POS!</span>
        </div>
      )}

      {/* 1. Store Profile Section */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🏪 Store Identity & Branding</span>
        </h3>

        <div className="form-grid">
          <div className="form-group">
            <label>Store Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tagline / Motto</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Owner / Manager Name</label>
            <input
              type="text"
              value={formData.owner_name}
              onChange={(e) => handleChange('owner_name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Contact Phone (WhatsApp) *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Store Address *</label>
            <textarea
              rows={2}
              required
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>GSTIN Number</label>
            <input
              type="text"
              value={formData.gstin}
              onChange={(e) => handleChange('gstin', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>UPI ID (For Dynamic QR Codes) *</label>
            <input
              type="text"
              required
              placeholder="e.g. apnakirana@okhdfcbank"
              value={formData.upi_id}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('upi_id', val);
                setPaymentForm(prev => ({ ...prev, upi_id: val, store_upi_id: val }));
              }}
            />
          </div>
        </div>

        {/* Store Brand Color Palette & Theme Customizer */}
        <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
          <label style={{ display: 'block', fontWeight: 800, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}>
            🎨 Store Theme & Custom Branding Colors
          </label>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px 0' }}>
            Choose a preset color palette or customize individual brand colors for your dashboard, buttons, and customer storefront.
          </p>

          {/* Preset Swatches */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              { name: '🌿 Kirana Fresh', primary: '#16a34a', secondary: '#0f766e', button: '#15803d' },
              { name: '⚡ Zepto Purple', primary: '#7c3aed', secondary: '#6d28d9', button: '#5b21b6' },
              { name: '👑 Royal Blue', primary: '#2563eb', secondary: '#1e40af', button: '#1d4ed8' },
              { name: '🍊 Warm Amber', primary: '#d97706', secondary: '#b45309', button: '#b45309' },
              { name: '🔴 Bharat Red', primary: '#dc2626', secondary: '#991b1b', button: '#b91c1c' },
              { name: '🖤 Modern Dark', primary: '#0f172a', secondary: '#334155', button: '#1e293b' }
            ].map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    primary_color: preset.primary,
                    secondary_color: preset.secondary,
                    button_color: preset.button
                  }));
                  document.documentElement.style.setProperty('--primary-500', preset.primary);
                  document.documentElement.style.setProperty('--primary-600', preset.primary);
                  document.documentElement.style.setProperty('--primary-700', preset.button);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  border: formData.primary_color === preset.primary ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  background: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: preset.primary, display: 'inline-block' }} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Primary Theme Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={formData.primary_color || '#16a34a'}
                  onChange={e => {
                    handleChange('primary_color', e.target.value);
                    document.documentElement.style.setProperty('--primary-500', e.target.value);
                    document.documentElement.style.setProperty('--primary-600', e.target.value);
                  }}
                  style={{ width: '40px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={formData.primary_color || '#16a34a'}
                  onChange={e => handleChange('primary_color', e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Secondary / Header Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={formData.secondary_color || '#0f766e'}
                  onChange={e => handleChange('secondary_color', e.target.value)}
                  style={{ width: '40px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={formData.secondary_color || '#0f766e'}
                  onChange={e => handleChange('secondary_color', e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Button / Action CTA Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={formData.button_color || '#15803d'}
                  onChange={e => {
                    handleChange('button_color', e.target.value);
                    document.documentElement.style.setProperty('--primary-700', e.target.value);
                  }}
                  style={{ width: '40px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={formData.button_color || '#15803d'}
                  onChange={e => handleChange('button_color', e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operations & Delivery Settings */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>
          🚚 Operating Hours & Delivery Policy
        </h3>

        <div className="form-grid">
          <div className="form-group">
            <label>Store Operational Status</label>
            <select
              value={formData.store_status}
              onChange={(e) => handleChange('store_status', e.target.value)}
            >
              <option value="OPEN">🟢 OPEN (Website accepts orders)</option>
              <option value="CLOSED">🔴 CLOSED (Website shows closed banner)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Operating Days</label>
            <input
              type="text"
              value={formData.operating_days}
              onChange={(e) => handleChange('operating_days', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Opening Time</label>
            <input
              type="time"
              value={formData.opening_time}
              onChange={(e) => handleChange('opening_time', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Closing Time</label>
            <input
              type="time"
              value={formData.closing_time}
              onChange={(e) => handleChange('closing_time', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Standard Delivery Fee (₹)</label>
            <input
              type="number"
              value={formData.delivery_charge}
              onChange={(e) => handleChange('delivery_charge', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label>Free Delivery Above Order (₹)</label>
            <input
              type="number"
              value={formData.free_delivery_above}
              onChange={(e) => handleChange('free_delivery_above', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label>Estimated Delivery Time</label>
            <input
              type="text"
              value={formData.estimated_delivery_mins}
              onChange={(e) => handleChange('estimated_delivery_mins', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. PHASE 3: PAYMENT GATEWAYS, STORE UPI & COD CONFIGURATION */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={20} color="var(--primary-700)" />
          <span>💳 Payment Gateways, Store UPI & Doorstep COD Settings</span>
        </h3>

        {/* Allowed Payment Methods Pills */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
            Enable / Disable Active Payment Methods for Store & App:
          </strong>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { id: 'RAZORPAY', label: 'Razorpay Online (UPI/Cards/Netbanking)' },
              { id: 'UPI', label: 'Direct Store UPI (Dynamic & Static QR)' },
              { id: 'CASH', label: 'Cash (POS & Doorstep Collection)' },
              { id: 'COD', label: 'Cash On Delivery (Online Orders)' }
            ].map(method => {
              let isSelected = false;
              try {
                const list = Array.isArray(paymentForm.allowed_methods)
                  ? paymentForm.allowed_methods
                  : JSON.parse((paymentForm.allowed_methods as string) || '[]');
                isSelected = list.includes(method.id);
              } catch {
                isSelected = true;
              }
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => togglePaymentMethod(method.id)}
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 'var(--radius-full)', padding: '6px 14px' }}
                >
                  <span>{isSelected ? '✓ ' : '+ '} {method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Razorpay Gateway Settings Sub-Card */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', padding: '18px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>Razorpay Payment Gateway</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Secure server-side card, UPI and netbanking checkout integration
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={Boolean(paymentForm.razorpay_enabled)}
                onChange={(e) => handlePaymentChange('razorpay_enabled', e.target.checked ? 1 : 0)}
              />
              <span>{paymentForm.razorpay_enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Environment Mode</label>
              <select
                value={paymentForm.razorpay_mode || 'test'}
                onChange={(e) => handlePaymentChange('razorpay_mode', e.target.value)}
              >
                <option value="test">Test / Sandbox (rzp_test_...)</option>
                <option value="live">Live Production (rzp_live_...)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Razorpay Key ID</label>
              <input
                type="text"
                placeholder="rzp_test_..."
                value={paymentForm.razorpay_key_id || ''}
                onChange={(e) => handlePaymentChange('razorpay_key_id', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Razorpay Key Secret (Server-only)</label>
              <input
                type="password"
                placeholder="•••••••••••• (Leave blank to keep current)"
                value={paymentForm.razorpay_key_secret || ''}
                onChange={(e) => handlePaymentChange('razorpay_key_secret', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Razorpay Webhook Secret</label>
              <input
                type="text"
                placeholder="whsec_..."
                value={paymentForm.razorpay_webhook_secret || ''}
                onChange={(e) => handlePaymentChange('razorpay_webhook_secret', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Store UPI & QR Configuration Sub-Card */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', padding: '18px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>Store UPI & Dynamic QR</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Used for instant doorstep delivery QR scanning and counter UPI billing
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={Boolean(paymentForm.upi_enabled)}
                onChange={(e) => handlePaymentChange('upi_enabled', e.target.checked ? 1 : 0)}
              />
              <span>{paymentForm.upi_enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Store UPI VPA Address</label>
              <input
                type="text"
                placeholder="e.g. apnakirana@okhdfcbank"
                value={paymentForm.upi_id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handlePaymentChange('upi_id', val);
                  setFormData(prev => ({ ...prev, upi_id: val }));
                }}
              />
            </div>

            <div className="form-group">
              <label>Merchant / Payee Name</label>
              <input
                type="text"
                placeholder="e.g. Apna Kirana Store"
                value={paymentForm.upi_store_name || ''}
                onChange={(e) => handlePaymentChange('upi_store_name', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Cash On Delivery (COD) Rules Sub-Card */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>Cash on Delivery (COD) Thresholds</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Set limits to prevent non-serviceable high value risks
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={Boolean(paymentForm.cod_enabled)}
                onChange={(e) => handlePaymentChange('cod_enabled', e.target.checked ? 1 : 0)}
              />
              <span>{paymentForm.cod_enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Minimum Order for COD (₹)</label>
              <input
                type="number"
                value={paymentForm.cod_min_order ?? 100}
                onChange={(e) => handlePaymentChange('cod_min_order', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Maximum Order for COD (₹)</label>
              <input
                type="number"
                value={paymentForm.cod_max_order ?? 5000}
                onChange={(e) => handlePaymentChange('cod_max_order', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. UNIFIED HARDWARE INTEGRATION (THERMAL PRINTER, BLUETOOTH, USB, BARCODE) */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={22} color="var(--primary-700)" />
            <span>Thermal Printer & Hardware Manager (Bluetooth & USB)</span>
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {printerStatus.isConnected ? (
              <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={13} />
                <span>Connected: {printerStatus.deviceName || printerStatus.mode}</span>
              </span>
            ) : (
              <span className="badge badge-gray" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                Default: Browser Print Dialog
              </span>
            )}
          </div>
        </div>

        {hardwareAlert && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: hardwareAlert.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${hardwareAlert.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: hardwareAlert.type === 'success' ? '#15803d' : '#991b1b'
            }}
          >
            {hardwareAlert.type === 'success' ? <Check size={16} /> : <Radio size={16} />}
            <span>{hardwareAlert.message}</span>
          </div>
        )}

        <div className="form-grid" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Thermal Paper Roll Width</label>
            <select
              value={formData.printer_width}
              onChange={(e) => {
                const val = e.target.value as '58mm' | '80mm';
                handleChange('printer_width', val);
                thermalPrinter.setWidth(val);
              }}
            >
              <option value="80mm">80mm (3-Inch Standard Supermarket Receipt - 48 cols)</option>
              <option value="58mm">58mm (2-Inch Compact Bluetooth/POS Receipt - 32 cols)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Direct Connection Protocol</label>
            <select
              value={formData.printer_connection}
              onChange={(e) => handleChange('printer_connection', e.target.value)}
            >
              <option value="BROWSER_DIRECT">Web Bluetooth / WebUSB Direct (ESC/POS)</option>
              <option value="PRINT_BRIDGE">Browser System Print Dialog / PDF Fallback</option>
            </select>
          </div>
        </div>

        {/* Device Health & Pairing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {/* Bluetooth Thermal Printer Card */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bluetooth size={16} color="#2563eb" />
                <span>Bluetooth Thermal</span>
              </strong>
              {printerStatus.mode === 'BLUETOOTH' && printerStatus.isConnected ? (
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>✓ Paired</span>
              ) : (
                <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                  {printerStatus.supportsBluetooth ? 'Supported' : 'No Web Bluetooth'}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              Portable 58mm / 80mm wireless Bluetooth POS receipt printers (Everycom, POS-5802, PT-210, MPT-II).
            </p>
            {printerStatus.mode === 'BLUETOOTH' && printerStatus.isConnected ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDirectTestPrint} style={{ flex: 1, fontSize: '0.75rem' }}>
                  Test Print
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDisconnectPrinter} style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConnectBt}
                disabled={isPairingBt}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', gap: '6px', background: '#2563eb', borderColor: '#2563eb' }}
              >
                {isPairingBt ? <Loader2 size={13} className="spin" /> : <Bluetooth size={13} />}
                <span>Pair Bluetooth Printer</span>
              </button>
            )}
          </div>

          {/* USB / Serial Thermal Printer Card */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Usb size={16} color="#059669" />
                <span>USB / Serial Thermal</span>
              </strong>
              {printerStatus.mode === 'USB' || printerStatus.mode === 'SERIAL' ? (
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>✓ Connected</span>
              ) : (
                <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                  {printerStatus.supportsUsb || printerStatus.supportsSerial ? 'Supported' : 'No WebUSB'}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              Direct USB desktop thermal printers (TVS RP-3200, Epson TM-T82, Xprinter, NGX, Everycom).
            </p>
            {printerStatus.mode === 'USB' || printerStatus.mode === 'SERIAL' ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDirectTestPrint} style={{ flex: 1, fontSize: '0.75rem' }}>
                  Test Print
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDisconnectPrinter} style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConnectUsb}
                disabled={isConnectingUsb}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', gap: '6px', background: '#059669', borderColor: '#059669' }}
              >
                {isConnectingUsb ? <Loader2 size={13} className="spin" /> : <Usb size={13} />}
                <span>Connect USB Printer</span>
              </button>
            )}
          </div>

          {/* Cash Drawer RJ11 Kick Card */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Banknote size={16} color="#d97706" />
                <span>Cash Drawer (RJ11)</span>
              </strong>
              <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>24V Auto Pulse</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              Kicks open metallic cash drawer via RJ11 cable plugged into the back of your thermal printer.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleKickDrawer}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', gap: '6px' }}
            >
              <span>Test Kick Drawer Pulse</span>
            </button>
          </div>
        </div>

        {/* Test Thermal Receipt Generator Button */}
        <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>Test Thermal Receipt Generator (ESC/POS)</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Generates a sample 58mm/80mm receipt with UPI QR code to test thermal paper feed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTestPrinter}
              style={{ gap: '6px' }}
            >
              <Printer size={15} />
              <span>Preview & Print Sample</span>
            </button>
          </div>
        </div>
      </div>

        {/* LIVE BARCODE SCANNER TEST BENCH (Requirement 51) */}
        <div style={{
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
          border: '1px solid var(--border-light)',
          marginBottom: '20px'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Barcode size={18} color="var(--primary-600)" />
            <span>Barcode Scanner Test Bench</span>
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Test your handheld USB or Bluetooth laser scanner without ringing up a sale. Point scanner at any product barcode.
          </p>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Scan a barcode below or type to test..."
              value={testBarcodeText}
              onChange={(e) => setTestBarcodeText(e.target.value)}
              style={{
                flex: '1 1 280px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--primary-500)',
                background: 'white',
                fontSize: '1rem',
                letterSpacing: '1px',
                fontWeight: 700
              }}
            />
            {testBarcodeText && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTestBarcodeText('')}
              >
                Clear
              </button>
            )}
          </div>

          {testBarcodeText && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  Last Scanned Barcode:
                </span>
                <strong style={{ fontSize: '1.2rem', color: '#047857', letterSpacing: '1px' }}>
                  {testBarcodeText}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#065f46', marginLeft: '10px' }}>
                  (Length: {testBarcodeText.length} digits)
                </span>
              </div>
              <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                ✓ Scanner Working Correctly
              </span>
            </div>
          )}
        </div>

        {/* BARCODE SCANNER SETUP GUIDE (Requirement 50) */}
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-main)' }}>
            📖 How to connect and setup your barcode scanner:
          </h4>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><strong>Connect Scanner:</strong> Plug the USB cable of your 1D/2D laser barcode scanner into your computer or tablet via USB-OTG.</li>
            <li><strong>Device Detection:</strong> The operating system detects it as a standard USB Keyboard / HID input device automatically (no driver needed).</li>
            <li><strong>Open POS:</strong> Click on <strong>POS Billing</strong> in the left navigation menu.</li>
            <li><strong>Scan Product:</strong> Point the laser line at any product barcode. The scanner will instantly send the barcode number followed by an ENTER key.</li>
            <li><strong>Instant Cart Addition:</strong> The product will be automatically identified and added to the billing cart in under 0.1 seconds.</li>
            <li><strong>For Bluetooth Scanners:</strong> Pair the scanner with your tablet in Bluetooth settings; it works identically as a wireless keyboard.</li>
          </ol>
        </div>

      {/* ─────────────────────────────────────────────────────────────────
          5. INVOICE CUSTOMIZATION & WHATSAPP SETTINGS (Phase 6)
      ───────────────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="var(--primary-700)" />
            <span>🧾 Invoice Customization & WhatsApp Billing</span>
          </h3>
          {invoiceSaveOk && (
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '4px 12px', borderRadius: 20 }}>✓ Saved</span>
          )}
        </div>

        {/* ── Invoice Display Toggles ── */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 14 }}>🖨️ Invoice Field Visibility</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {([
              { key: 'invoice_show_logo', label: 'Show Store Logo' },
              { key: 'invoice_show_gst', label: 'Show GSTIN Number' },
              { key: 'invoice_show_address', label: 'Show Store Address' },
              { key: 'invoice_show_phone', label: 'Show Store Phone' },
              { key: 'invoice_show_customer_name', label: 'Show Customer Name' },
              { key: 'invoice_show_customer_mobile', label: 'Show Customer Mobile' },
              { key: 'invoice_show_qr', label: 'Show UPI QR Code' },
              { key: 'invoice_show_tax', label: 'Show GST Amount' },
              { key: 'invoice_show_discount', label: 'Show Discount Line' },
            ] as { key: keyof InvoiceSettings; label: string }[]).map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.84rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={Boolean(invoiceSettings[key])}
                  onChange={e => setInvoiceSettings(p => ({ ...p, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* ── Invoice Text Fields ── */}
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label>Invoice Number Prefix</label>
            <input
              type="text"
              placeholder="INV"
              value={invoiceSettings.invoice_prefix || 'INV'}
              onChange={e => setInvoiceSettings(p => ({ ...p, invoice_prefix: e.target.value }))}
            />
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Bills will be numbered INV-001, INV-002…</div>
          </div>
          <div className="form-group">
            <label>Minimum Margin Alert (%)</label>
            <input
              type="number" min={0} max={100} step={1}
              value={invoiceSettings.minimum_margin_alert_percent || 10}
              onChange={e => setInvoiceSettings(p => ({ ...p, minimum_margin_alert_percent: parseFloat(e.target.value) || 0 }))}
            />
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Products below this margin will be flagged 🟡</div>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Invoice Footer Message</label>
            <input
              type="text"
              value={invoiceSettings.invoice_footer_message || ''}
              onChange={e => setInvoiceSettings(p => ({ ...p, invoice_footer_message: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Thank-you Message (Thermal Receipt Bottom)</label>
            <input
              type="text"
              value={invoiceSettings.invoice_thank_you_message || ''}
              onChange={e => setInvoiceSettings(p => ({ ...p, invoice_thank_you_message: e.target.value }))}
            />
          </div>
        </div>

        {/* ── POS Margin Rules ── */}
        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 10 }}>⚠️ POS Pricing Guard Rails</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={Boolean(invoiceSettings.allow_selling_below_cost)}
                onChange={e => setInvoiceSettings(p => ({ ...p, allow_selling_below_cost: e.target.checked }))}
              />
              Allow POS cashier to sell below purchase cost
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={Boolean(invoiceSettings.allow_negative_inventory)}
                onChange={e => setInvoiceSettings(p => ({ ...p, allow_negative_inventory: e.target.checked }))}
              />
              Allow stock to go negative at POS
            </label>
          </div>
        </div>

        {/* ── WhatsApp Business Settings ── */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={20} color="#25d366" />
              <div>
                <strong style={{ fontSize: '0.95rem' }}>WhatsApp Business Invoice Dispatch</strong>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Send digital invoices automatically via WhatsApp Business API after every POS sale</div>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={Boolean(invoiceSettings.whatsapp_enabled)}
                onChange={e => setInvoiceSettings(p => ({ ...p, whatsapp_enabled: e.target.checked }))}
              />
              <span style={{ color: invoiceSettings.whatsapp_enabled ? '#15803d' : '#64748b' }}>
                {invoiceSettings.whatsapp_enabled ? '✅ Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>WhatsApp Business Phone Number</label>
              <input
                type="text"
                placeholder="+919876543210"
                value={invoiceSettings.whatsapp_business_number || ''}
                onChange={e => setInvoiceSettings(p => ({ ...p, whatsapp_business_number: e.target.value }))}
              />
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3 }}>Your WhatsApp Business registered number</div>
            </div>
            <div className="form-group">
              <label>Phone Number ID (Meta Developer Console)</label>
              <input
                type="text"
                placeholder="e.g. 123456789012345"
                value={invoiceSettings.whatsapp_phone_number_id || ''}
                onChange={e => setInvoiceSettings(p => ({ ...p, whatsapp_phone_number_id: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>WhatsApp Account ID (WABA ID)</label>
              <input
                type="text"
                placeholder="e.g. 987654321098765"
                value={invoiceSettings.whatsapp_account_id || ''}
                onChange={e => setInvoiceSettings(p => ({ ...p, whatsapp_account_id: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Message Template Name</label>
              <input
                type="text"
                placeholder="kirana_invoice_notification"
                value={invoiceSettings.whatsapp_template_name || ''}
                onChange={e => setInvoiceSettings(p => ({ ...p, whatsapp_template_name: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Permanent Access Token (Cloud API Bearer Token)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type={showWaToken ? 'text' : 'password'}
                  placeholder={invoiceSettings.whatsapp_access_token_configured ? '•••••••• (currently set — enter new to replace)' : 'Paste your permanent access token from Meta for Developers'}
                  defaultValue=""
                  onChange={e => setInvoiceSettings(p => ({ ...p, whatsapp_access_token: e.target.value } as any))}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowWaToken(v => !v)}>
                  {showWaToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {invoiceSettings.whatsapp_access_token_configured && (
                <div style={{ fontSize: '0.73rem', color: '#15803d', marginTop: 3, fontWeight: 600 }}>✅ Access token is currently configured</div>
              )}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', marginTop: 10, padding: '10px 14px', background: invoiceSettings.whatsapp_auto_send ? '#f0fdf4' : '#f8fafc', borderRadius: 10, border: `1px solid ${invoiceSettings.whatsapp_auto_send ? '#bbf7d0' : '#e2e8f0'}` }}>
            <input
              type="checkbox"
              checked={Boolean(invoiceSettings.whatsapp_auto_send)}
              onChange={e => setInvoiceSettings(p => ({ ...p, whatsapp_auto_send: e.target.checked }))}
            />
            <Bell size={16} color={invoiceSettings.whatsapp_auto_send ? '#15803d' : '#94a3b8'} />
            <span style={{ color: invoiceSettings.whatsapp_auto_send ? '#15803d' : '#475569' }}>
              Auto-send WhatsApp invoice to customer after every POS sale (when customer mobile number is captured)
            </span>
          </label>
        </div>

        {/* Save Invoice Settings Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isInvoiceSaving}
            style={{ gap: 8 }}
            onClick={async () => {
              setIsInvoiceSaving(true);
              setInvoiceSaveOk(false);
              try {
                await api.updateInvoiceSettings(invoiceSettings);
                setInvoiceSaveOk(true);
                setTimeout(() => setInvoiceSaveOk(false), 3000);
              } catch (err: any) {
                alert('Failed to save invoice settings: ' + err.message);
              } finally {
                setIsInvoiceSaving(false);
              }
            }}
          >
            <Save size={16} />
            <span>{isInvoiceSaving ? 'Saving…' : 'Save Invoice & WhatsApp Settings'}</span>
          </button>
        </div>
      </div>

      {/* Save Button — Store Profile + Payment + Hardware */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={isSaving}
          style={{ gap: '8px' }}
        >
          <Save size={18} />
          <span>{isSaving ? 'SAVING...' : 'SAVE ALL SETTINGS'}</span>
        </button>
      </div>
    </form>
  );
};
