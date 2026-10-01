import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, Customer, StoreProfile } from '../../types';
import { api } from '../../services/api';
import { barcodeScanner, weighingScale, ThermalPrinterAdapter, ReceiptData } from '../../services/hardware';
import { offlineSync } from '../../services/offlineSync';
import {
  Search,
  Barcode,
  Scale,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Plus,
  Percent,
  RefreshCw,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertCircle,
  Tag,
  ShieldAlert,
  Edit3
} from 'lucide-react';

interface POSTerminalProps {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  store: StoreProfile;
  onOpenReceipt: (data: ReceiptData) => void;
  onRefreshData: () => void;
}

interface PosCartItem {
  product: Product;
  quantity: number;
  unit: string;
  original_price: number;
  unit_price: number;
  discount_type?: 'FLAT' | 'PERCENT';
  discount_value?: number;
  discount_amount?: number;
  discount_reason?: string;
  manager_pin_approved?: boolean;
  manager_pin?: string;
  total_price: number;
}

export const POSTerminal: React.FC<POSTerminalProps> = ({
  products,
  categories,
  customers,
  store,
  onOpenReceipt,
  onRefreshData,
}) => {
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Discount
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [discountVal, setDiscountVal] = useState<number>(0);

  // Item Level Discount & Manual Price Adjustment Modal State
  const [discountModalItem, setDiscountModalItem] = useState<PosCartItem | null>(null);
  const [itemDiscMode, setItemDiscMode] = useState<'FLAT' | 'PERCENT' | 'NEGOTIATED'>('FLAT');
  const [itemDiscVal, setItemDiscVal] = useState<string>('0');
  const [itemDiscReason, setItemDiscReason] = useState<string>('Customer negotiation');
  const [managerPinInput, setManagerPinInput] = useState<string>('');
  const [managerApprovalNeeded, setManagerApprovalNeeded] = useState<boolean>(false);
  const [managerPinError, setManagerPinError] = useState<string>('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Loose Weight Scale Modal State
  const [scaleModalProduct, setScaleModalProduct] = useState<Product | null>(null);
  const [scaleWeight, setScaleWeight] = useState<number>(1.000);
  const [scaleStable, setScaleStable] = useState<boolean>(true);

  // Offline status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(offlineSync.getQueuedOrders().length);

  // Connect Barcode Scanner Listener
  useEffect(() => {
    barcodeScanner.connect((scannedCode) => {
      handleBarcodeScanned(scannedCode);
    });

    const handleOnline = () => {
      setIsOnline(true);
      handleSyncOfflineOrders();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cache products locally for offline resilience
    offlineSync.cacheProducts(products);

    return () => {
      barcodeScanner.disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [products]);

  // Dedicated Barcode Input State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeNotFound, setBarcodeNotFound] = useState<{ barcode: string } | null>(null);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  const handleBarcodeScanned = (barcode: string) => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return;
    const found = products.find(p => p.barcode === cleanCode);
    if (found) {
      setBarcodeNotFound(null);
      setLastScannedFeedback(`✓ Added ${found.name}`);
      setTimeout(() => setLastScannedFeedback(null), 2500);
      if (found.is_loose || found.unit === 'KG') {
        openScaleModal(found);
      } else {
        addToCart(found, 1);
      }
    } else {
      setBarcodeNotFound({ barcode: cleanCode });
    }
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeScanned(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  const openScaleModal = (prod: Product) => {
    setScaleModalProduct(prod);
    weighingScale.connectSimulated((w, stable) => {
      setScaleWeight(w);
      setScaleStable(stable);
    });
  };

  const closeScaleModal = () => {
    weighingScale.disconnect();
    setScaleModalProduct(null);
  };

  const confirmScaleWeight = () => {
    if (!scaleModalProduct) return;
    addToCart(scaleModalProduct, scaleWeight);
    closeScaleModal();
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const isLoose = product.is_loose || product.unit === 'KG';

      if (existing) {
        const newQty = isLoose ? existing.quantity + quantity : existing.quantity + 1;
        const roundedQty = Math.round(newQty * 1000) / 1000;
        const total = Math.round(roundedQty * existing.unit_price * 100) / 100;
        const discAmount = Math.round(roundedQty * (existing.original_price - existing.unit_price) * 100) / 100;
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: roundedQty,
                discount_amount: discAmount,
                total_price: total
              }
            : item
        );
      } else {
        const total = Math.round(quantity * product.selling_price * 100) / 100;
        return [
          ...prev,
          {
            product,
            quantity,
            unit: product.unit,
            original_price: product.selling_price,
            unit_price: product.selling_price,
            discount_type: 'FLAT',
            discount_value: 0,
            discount_amount: 0,
            discount_reason: '',
            manager_pin_approved: false,
            total_price: total
          }
        ];
      }
    });
  };

  const updateCartItemQty = (prodId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(it => it.product.id !== prodId));
      return;
    }
    setCart(prev => prev.map(it => {
      if (it.product.id === prodId) {
        const rounded = Math.round(newQty * 1000) / 1000;
        const lineTotal = Math.round(rounded * it.unit_price * 100) / 100;
        const lineDiscount = Math.round(rounded * (it.original_price - it.unit_price) * 100) / 100;
        return {
          ...it,
          quantity: rounded,
          discount_amount: lineDiscount,
          total_price: lineTotal
        };
      }
      return it;
    }));
  };

  const openItemDiscountModal = (item: PosCartItem) => {
    setDiscountModalItem(item);
    setItemDiscMode(item.discount_type || 'FLAT');
    setItemDiscVal(item.discount_value ? String(item.discount_value) : '0');
    setItemDiscReason(item.discount_reason || 'Customer negotiation');
    setManagerPinInput('');
    setManagerApprovalNeeded(false);
    setManagerPinError('');
  };

  const handleApplyItemDiscount = () => {
    if (!discountModalItem) return;
    const basePrice = discountModalItem.original_price;
    const val = parseFloat(itemDiscVal) || 0;
    let computedUnitPrice = basePrice;
    let unitDiscount = 0;
    let discType: 'FLAT' | 'PERCENT' = 'FLAT';
    let discVal = val;

    if (itemDiscMode === 'FLAT') {
      discType = 'FLAT';
      unitDiscount = Math.min(basePrice, Math.max(0, val));
      computedUnitPrice = Math.max(0, basePrice - unitDiscount);
      discVal = unitDiscount;
    } else if (itemDiscMode === 'PERCENT') {
      discType = 'PERCENT';
      const pct = Math.min(100, Math.max(0, val));
      unitDiscount = Math.round((basePrice * pct) / 100 * 100) / 100;
      computedUnitPrice = Math.max(0, basePrice - unitDiscount);
      discVal = pct;
    } else if (itemDiscMode === 'NEGOTIATED') {
      discType = 'FLAT';
      computedUnitPrice = Math.min(basePrice, Math.max(0, val));
      unitDiscount = basePrice - computedUnitPrice;
      discVal = unitDiscount;
    }

    const discountPercentage = basePrice > 0 ? (unitDiscount / basePrice) * 100 : 0;
    const CASHIER_MAX_DISCOUNT_PERCENT = 5;

    if (discountPercentage > CASHIER_MAX_DISCOUNT_PERCENT && !managerApprovalNeeded) {
      setManagerApprovalNeeded(true);
      setManagerPinError(`Discount of ${discountPercentage.toFixed(1)}% exceeds cashier 5% limit. Enter Manager PIN (e.g. 1234) to approve.`);
      return;
    }

    if (managerApprovalNeeded) {
      if (!managerPinInput || managerPinInput.length < 4) {
        setManagerPinError('Please enter a valid 4-digit Manager PIN to authorize this discount.');
        return;
      }
    }

    const qty = discountModalItem.quantity;
    const lineTotal = Math.round(qty * computedUnitPrice * 100) / 100;
    const totalLineDiscount = Math.round(qty * unitDiscount * 100) / 100;

    setCart(prev => prev.map(it => {
      if (it.product.id === discountModalItem.product.id) {
        return {
          ...it,
          unit_price: computedUnitPrice,
          discount_type: discType,
          discount_value: discVal,
          discount_amount: totalLineDiscount,
          discount_reason: itemDiscReason,
          manager_pin_approved: managerApprovalNeeded,
          manager_pin: managerApprovalNeeded ? managerPinInput : undefined,
          total_price: lineTotal
        };
      }
      return it;
    }));

    setDiscountModalItem(null);
  };

  const removeCartItem = (prodId: string) => {
    setCart(prev => prev.filter(it => it.product.id !== prodId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountVal(0);
    setCashTendered('');
  };

  // Calculations
  const grossSubtotal = cart.reduce((sum, it) => sum + (it.quantity * it.original_price), 0);
  const totalItemDiscounts = cart.reduce((sum, it) => sum + (it.discount_amount || 0), 0);
  const netItemSubtotal = cart.reduce((sum, it) => sum + it.total_price, 0);

  let cartDiscountAmount = 0;
  if (discountType === 'PERCENT') {
    cartDiscountAmount = Math.round((netItemSubtotal * discountVal) / 100);
  } else {
    cartDiscountAmount = Math.min(netItemSubtotal, discountVal);
  }

  const grandTotal = Math.max(0, netItemSubtotal - cartDiscountAmount);
  const totalSavings = totalItemDiscounts + cartDiscountAmount;
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);

  // Complete POS Transaction & Print
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomer) {
      alert('Please select a customer to record Khata (Store Credit / Udhar)');
      return;
    }

    setIsProcessing(true);

    const payload = {
      items: cart.map(it => ({
        product_id: it.product.id,
        product_name: it.product.name,
        unit: it.unit,
        quantity: it.quantity,
        original_price: it.original_price,
        unit_price: it.unit_price,
        discount_type: it.discount_type || 'FLAT',
        discount_value: it.discount_value || 0,
        discount_amount: it.discount_amount || 0,
        discount_reason: it.discount_reason || null,
        manager_pin_approved: it.manager_pin_approved ? 1 : 0,
        manager_pin: it.manager_pin || null,
        cost_price: it.product.purchase_cost,
        gst_percent: it.product.gst_percent,
      })),
      customer: selectedCustomer,
      discount: cartDiscountAmount,
      total_item_discounts: totalItemDiscounts,
      payment_method: paymentMethod,
      notes: paymentMethod === 'CASH' && tenderedNum > 0 ? `Cash Tendered: ₹${tenderedNum}, Change: ₹${changeDue.toFixed(2)}` : '',
    };

    try {
      let billResult: any;

      if (!navigator.onLine) {
        // Enqueue offline bill
        const offlineOrder = offlineSync.enqueueOrder(payload);
        setOfflineQueueCount(offlineSync.getQueuedOrders().length);
        billResult = {
          success: true,
          order_number: offlineOrder.order_number,
          invoice_number: offlineOrder.invoice_number,
          total_amount: grandTotal,
          created_at: offlineOrder.created_at
        };
      } else {
        try {
          billResult = await api.createPosOrder(payload);
        } catch (netErr) {
          console.warn('[Network issue detected during billing. Auto-saving offline]:', netErr);
          const offlineOrder = offlineSync.enqueueOrder(payload);
          setOfflineQueueCount(offlineSync.getQueuedOrders().length);
          billResult = {
            success: true,
            order_number: offlineOrder.order_number,
            invoice_number: offlineOrder.invoice_number,
            total_amount: grandTotal,
            created_at: offlineOrder.created_at
          };
        }
      }

      // Prepare Receipt Data
      const receipt: ReceiptData = {
        store_name: store.name,
        store_tagline: store.tagline,
        address: store.address,
        phone: store.phone,
        gstin: store.gstin,
        invoice_no: billResult.invoice_number,
        order_no: billResult.order_number,
        date_time: new Date().toLocaleString('en-IN'),
        cashier: 'POS Cashier 1',
        customer_name: selectedCustomer?.name || 'Walk-in Customer',
        customer_phone: selectedCustomer?.phone || '',
        items: cart.map(it => ({
          name: it.product.name,
          qty: it.quantity,
          unit: it.unit,
          rate: it.original_price,
          discount: it.discount_amount || 0,
          amount: it.total_price,
        })),
        subtotal: grossSubtotal,
        discount: totalSavings,
        total: grandTotal,
        payment_method: paymentMethod,
        upi_id: store.upi_id,
        footer_text: 'Thank you for shopping at ' + store.name,
      };

      // Open receipt modal for thermal printing
      onOpenReceipt(receipt);
      clearCart();
      onRefreshData();
    } catch (err) {
      alert('Error finalizing sale: ' + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncOfflineOrders = async () => {
    const res = await offlineSync.syncPendingOrders(api.createPosOrder);
    if (res.syncedCount > 0) {
      alert(`Successfully synchronized ${res.syncedCount} offline transactions!`);
      setOfflineQueueCount(offlineSync.getQueuedOrders().length);
      onRefreshData();
    }
  };

  // Filter products for touch grid
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.barcode.includes(search) ||
                          p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === '' || p.category_id === selectedCategory;
    return matchesSearch && matchesCat && Boolean(p.is_pos_available) && Boolean(p.is_active);
  });

  return (
    <div className="pos-layout">
      {/* LEFT: Catalog Grid & Search */}
      <div className="pos-catalog-panel">
        {/* Barcode / Scan Alerts */}
        {barcodeNotFound && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: '#991b1b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>Product not found for barcode: <strong>{barcodeNotFound.barcode}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBarcodeNotFound(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {lastScannedFeedback && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            marginBottom: '10px',
            fontSize: '0.85rem',
            color: '#065f46',
            fontWeight: 700
          }}>
            {lastScannedFeedback}
          </div>
        )}

        {/* Header Bar */}
        <div className="pos-search-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div className="pos-search-box" style={{ flex: '1 1 240px' }}>
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Search by name or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: '#94a3b8', fontWeight: 700 }}>
                ✕
              </button>
            )}
          </div>

          {/* Dedicated Barcode Scanner Input Form */}
          <form
            onSubmit={handleManualBarcodeSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'white',
              border: '2px solid var(--primary-500)',
              borderRadius: 'var(--radius-md)',
              padding: '2px 8px',
              flex: '1 1 260px'
            }}
          >
            <Barcode size={18} color="var(--primary-700)" style={{ marginRight: '6px' }} />
            <input
              type="text"
              placeholder="Scan Barcode / Enter Code..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              style={{ border: 'none', width: '100%', fontSize: '0.85rem', outline: 'none' }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
            >
              Scan
            </button>
          </form>

          {/* Barcode scanner active badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'var(--primary-100)',
            color: 'var(--primary-800)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)'
          }}>
            <Barcode size={16} />
            <span>Scanner Ready</span>
          </div>

          {/* Offline Sync Status */}
          {offlineQueueCount > 0 && (
            <button
              className="btn btn-accent btn-sm"
              onClick={handleSyncOfflineOrders}
              title="Click to sync offline bills"
            >
              <RefreshCw size={13} />
              <span>Sync {offlineQueueCount} Offline Bills</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="pos-category-bar">
          <button
            className={`pos-cat-pill ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`pos-cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Touch Tiles Grid */}
        <div className="pos-grid-items">
          {filteredProducts.map(p => {
            const isLoose = p.is_loose || p.unit === 'KG';
            return (
              <div
                key={p.id}
                className="pos-item-tile"
                onClick={() => {
                  if (isLoose) openScaleModal(p);
                  else addToCart(p, 1);
                }}
              >
                <img src={p.photo_url} alt={p.name} className="pos-tile-img" />
                <div className="pos-tile-name">{p.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {isLoose ? 'Per KG (Loose)' : `1 ${p.unit}`}
                </div>
                <div className="pos-tile-price">
                  ₹{p.selling_price}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Active Billing Cart & Payment Panel */}
      <div className="pos-billing-panel">
        {/* Cashier Bar */}
        <div className="pos-bill-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>⚡ Counter Bill</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({cart.length} items)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn-sm btn-secondary"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'transparent' }}
              onClick={clearCart}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Customer Khata Selector */}
        <div className="pos-customer-selector">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <User size={16} color="var(--primary-700)" />
            <select
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.825rem', width: '100%', background: 'white' }}
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const c = customers.find(cust => cust.id === e.target.value);
                setSelectedCustomer(c || null);
              }}
            >
              <option value="">Walk-in Customer (No Khata)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - Khata: ₹{c.credit_balance}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedCustomer.credit_balance > 0 ? '#ea580c' : 'var(--primary-700)', whiteSpace: 'nowrap' }}>
              Udhar: ₹{selectedCustomer.credit_balance}
            </div>
          )}
        </div>

        {/* Cart Line Items */}
        <div className="pos-cart-items-list">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛒</div>
              <p style={{ fontWeight: 700 }}>Scan barcode or click items on the left</p>
            </div>
          ) : (
            cart.map(item => {
              const isLoose = item.product.is_loose || item.unit === 'KG';
              const step = isLoose ? 0.250 : 1;
              const hasDiscount = item.discount_amount && item.discount_amount > 0;

              return (
                <div key={item.product.id} className="pos-cart-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) auto auto auto', gap: '8px', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.825rem' }}>{item.product.name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem', marginTop: '2px', flexWrap: 'wrap' }}>
                      {hasDiscount ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>
                            ₹{item.original_price}
                          </span>
                          <span style={{ fontWeight: 800, color: '#059669' }}>
                            ₹{item.unit_price}/{item.unit}
                          </span>
                          <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.68rem', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                            -₹{item.discount_amount}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          ₹{item.unit_price}/{item.unit}
                        </span>
                      )}

                      {/* Line Item Discount Button */}
                      <button
                        type="button"
                        onClick={() => openItemDiscountModal(item)}
                        title="Negotiate Price / Add Item Discount"
                        style={{
                          background: hasDiscount ? '#fef3c7' : '#f1f5f9',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: hasDiscount ? '#b45309' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        <Tag size={10} />
                        {hasDiscount ? 'Discounted' : 'Discount'}
                      </button>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="btn-icon btn-secondary"
                      style={{ width: '24px', height: '24px', padding: 0 }}
                      onClick={() => updateCartItemQty(item.product.id, item.quantity - step)}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', minWidth: '36px', textAlign: 'center' }}>
                      {isLoose ? `${item.quantity.toFixed(3)}` : item.quantity}
                    </span>
                    <button
                      className="btn-icon btn-secondary"
                      style={{ width: '24px', height: '24px', padding: 0 }}
                      onClick={() => updateCartItemQty(item.product.id, item.quantity + step)}
                    >
                      +
                    </button>
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: 800 }}>
                    ₹{item.total_price.toFixed(2)}
                  </div>

                  <button
                    className="btn-icon"
                    style={{ color: '#ef4444', width: '24px', height: '24px' }}
                    onClick={() => removeCartItem(item.product.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Totals & Discounts Section */}
        <div className="pos-totals-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '3px' }}>
            <span>Gross Subtotal:</span>
            <span>₹{grossSubtotal.toFixed(2)}</span>
          </div>

          {totalItemDiscounts > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#059669', marginBottom: '3px' }}>
              <span>Item Discounts:</span>
              <span>-₹{totalItemDiscounts.toFixed(2)}</span>
            </div>
          )}

          {/* Bill-level Discount Field */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.825rem' }}>Bill Discount:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                style={{ padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                <option value="FLAT">₹ Flat</option>
                <option value="PERCENT">% Off</option>
              </select>
              <input
                type="number"
                value={discountVal || ''}
                placeholder="0"
                onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
                style={{ width: '60px', padding: '2px 6px', fontSize: '0.8rem', textAlign: 'right' }}
              />
            </div>
          </div>

          {totalSavings > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.825rem',
              fontWeight: 800,
              color: '#059669',
              background: '#ecfdf5',
              padding: '3px 8px',
              borderRadius: '4px',
              marginBottom: '6px'
            }}>
              <span>Total Savings:</span>
              <span>₹{totalSavings.toFixed(2)}</span>
            </div>
          )}

          {/* Cash Tendered & Change Return for Cash mode */}
          {paymentMethod === 'CASH' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cash Tendered:</span>
              <input
                type="number"
                placeholder="e.g. 500"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                style={{ width: '80px', padding: '3px 6px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700 }}
              />
            </div>
          )}

          {paymentMethod === 'CASH' && tenderedNum > grandTotal && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#047857', fontWeight: 800 }}>
              <span>Change Return:</span>
              <span>₹{changeDue.toFixed(2)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="pos-grand-total">
            <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Total Due:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Mode Selector Buttons */}
        <div className="pos-payment-actions">
          <button
            className={`btn-sm ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 4px', fontSize: '0.75rem', gap: '4px' }}
            onClick={() => setPaymentMethod('CASH')}
          >
            <Banknote size={15} /> Cash
          </button>
          <button
            className={`btn-sm ${paymentMethod === 'UPI' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 4px', fontSize: '0.75rem', gap: '4px' }}
            onClick={() => setPaymentMethod('UPI')}
          >
            <QrCode size={15} /> UPI QR
          </button>
          <button
            className={`btn-sm ${paymentMethod === 'CARD' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 4px', fontSize: '0.75rem', gap: '4px' }}
            onClick={() => setPaymentMethod('CARD')}
          >
            <CreditCard size={15} /> Card
          </button>
          <button
            className={`btn-sm ${paymentMethod === 'CREDIT' ? 'btn-accent' : 'btn-secondary'}`}
            style={{ padding: '8px 4px', fontSize: '0.75rem', gap: '4px' }}
            onClick={() => setPaymentMethod('CREDIT')}
          >
            Udhar (Khata)
          </button>
        </div>

        {/* Final Action Button: Bill & Thermal Print */}
        <div style={{ padding: '12px 20px', background: 'white' }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', gap: '10px' }}
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCompleteSale}
          >
            <Printer size={20} />
            <span>
              {isProcessing ? 'BILLING...' : `PRINT BILL (₹${grandTotal.toFixed(2)})`}
            </span>
          </button>
        </div>
      </div>

      {/* ====================================================
          MODAL: DIGITAL WEIGHING SCALE ADAPTER
          ==================================================== */}
      {scaleModalProduct && (
        <div className="modal-backdrop" onClick={closeScaleModal}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={20} color="var(--primary-700)" />
                <h3>Digital Weighing Scale</h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={closeScaleModal}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                {scaleModalProduct.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Rate: <strong>₹{scaleModalProduct.selling_price} / {scaleModalProduct.unit}</strong>
              </div>

              {/* Digital Scale LED Display */}
              <div style={{
                background: '#0f172a',
                color: '#4ade80',
                fontFamily: 'var(--font-mono)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid #334155',
                marginBottom: '16px',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  {scaleStable ? '● STABLE WEIGHT' : '○ SETTLING...'}
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>
                  {scaleWeight.toFixed(3)}
                  <span style={{ fontSize: '1.25rem', marginLeft: '6px', color: '#86efac' }}>KG</span>
                </div>
                <div style={{ fontSize: '1.25rem', color: '#fef08a', marginTop: '10px', fontWeight: 700 }}>
                  ₹{(scaleWeight * scaleModalProduct.selling_price).toFixed(2)}
                </div>
              </div>

              {/* Scale Control Buttons (Tare, Zero, Quick Presets) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setScaleWeight(0.250)}
                >
                  250g
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setScaleWeight(0.500)}
                >
                  500g
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setScaleWeight(1.000)}
                >
                  1.0 KG
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setScaleWeight(2.000)}
                >
                  2.0 KG
                </button>
              </div>

              {/* Manual weight input fallback */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Or enter grams/kg:</span>
                <input
                  type="number"
                  step="0.05"
                  value={scaleWeight}
                  onChange={(e) => setScaleWeight(parseFloat(e.target.value) || 0.1)}
                  style={{ width: '90px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontWeight: 800, textAlign: 'center' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeScaleModal}>
                Cancel
              </button>
              <button className="btn btn-primary btn-lg" onClick={confirmScaleWeight} style={{ gap: '6px' }}>
                <CheckCircle2 size={18} />
                <span>ACCEPT WEIGHT & ADD TO CART</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: ITEM LEVEL DISCOUNT & MANUAL PRICE ADJUSTMENT
          ==================================================== */}
      {discountModalItem && (() => {
        const basePrice = discountModalItem.original_price;
        const val = parseFloat(itemDiscVal) || 0;
        let computedUnitPrice = basePrice;
        let unitDiscount = 0;
        if (itemDiscMode === 'FLAT') {
          unitDiscount = Math.min(basePrice, Math.max(0, val));
          computedUnitPrice = Math.max(0, basePrice - unitDiscount);
        } else if (itemDiscMode === 'PERCENT') {
          const pct = Math.min(100, Math.max(0, val));
          unitDiscount = Math.round((basePrice * pct) / 100 * 100) / 100;
          computedUnitPrice = Math.max(0, basePrice - unitDiscount);
        } else if (itemDiscMode === 'NEGOTIATED') {
          computedUnitPrice = Math.min(basePrice, Math.max(0, val));
          unitDiscount = basePrice - computedUnitPrice;
        }
        const discountPct = basePrice > 0 ? (unitDiscount / basePrice) * 100 : 0;
        const isOverCashierLimit = discountPct > 5;

        return (
          <div className="modal-backdrop" onClick={() => setDiscountModalItem(null)}>
            <div className="modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={20} color="var(--primary-700)" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Item Discount &amp; Price Adjustment</h3>
                </div>
                <button className="btn-icon btn-secondary" onClick={() => setDiscountModalItem(null)}>
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ padding: '16px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {discountModalItem.product.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Original Rate: <strong>₹{basePrice} / {discountModalItem.unit}</strong> | Qty: <strong>{discountModalItem.quantity}</strong>
                </div>

                {/* Adjustment Mode Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
                  {[
                    { mode: 'FLAT', label: '₹ Flat Discount' },
                    { mode: 'PERCENT', label: '% Percentage' },
                    { mode: 'NEGOTIATED', label: 'Manual Rate' }
                  ].map(tab => (
                    <button
                      key={tab.mode}
                      type="button"
                      onClick={() => setItemDiscMode(tab.mode as any)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: itemDiscMode === tab.mode ? '2px solid var(--primary-700)' : '1px solid #cbd5e1',
                        background: itemDiscMode === tab.mode ? '#ecfdf5' : '#f8fafc',
                        color: itemDiscMode === tab.mode ? 'var(--primary-700)' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Value Input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {itemDiscMode === 'FLAT' && 'Discount Amount per unit (₹):'}
                    {itemDiscMode === 'PERCENT' && 'Discount Percentage (%):'}
                    {itemDiscMode === 'NEGOTIATED' && 'Negotiated Selling Price (₹):'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={itemDiscVal}
                    onChange={(e) => setItemDiscVal(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '1.1rem',
                      fontWeight: 700
                    }}
                  />
                </div>

                {/* Live Math Calculation Summary Card */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px'
                }}>
                  <div>Unit Discount: <strong style={{ color: '#059669' }}>₹{unitDiscount.toFixed(2)}</strong></div>
                  <div>Final Rate: <strong style={{ color: '#0f172a' }}>₹{computedUnitPrice.toFixed(2)}</strong></div>
                  <div>Discount %: <strong style={{ color: isOverCashierLimit ? '#dc2626' : '#059669' }}>{discountPct.toFixed(1)}%</strong></div>
                  <div>Total Line Savings: <strong style={{ color: '#059669' }}>₹{(unitDiscount * discountModalItem.quantity).toFixed(2)}</strong></div>
                </div>

                {/* Reason Selection */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Discount Reason *
                  </label>
                  <select
                    value={itemDiscReason}
                    onChange={(e) => setItemDiscReason(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Customer negotiation">Customer negotiation</option>
                    <option value="Damaged packaging">Damaged packaging</option>
                    <option value="Bulk purchase">Bulk purchase</option>
                    <option value="Loyal customer">Loyal customer</option>
                    <option value="Promotional discount">Promotional discount</option>
                    <option value="Clearance">Clearance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Manager Approval Box (if > 5%) */}
                {(isOverCashierLimit || managerApprovalNeeded) && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 700, fontSize: '0.825rem', marginBottom: '4px' }}>
                      <ShieldAlert size={16} />
                      Manager Approval Required ({discountPct.toFixed(1)}% &gt; 5% limit)
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#92400e' }}>
                      Cashier discount limit is 5%. Please enter the 4-digit Manager PIN (e.g. 1234) to authorize this price reduction.
                    </p>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Manager PIN"
                      value={managerPinInput}
                      onChange={(e) => setManagerPinInput(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #f59e0b',
                        fontSize: '1rem',
                        letterSpacing: '4px',
                        width: '140px'
                      }}
                    />
                    {managerPinError && (
                      <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                        {managerPinError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDiscountModalItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyItemDiscount}
                >
                  Apply Item Discount
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
