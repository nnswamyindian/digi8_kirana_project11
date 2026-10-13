import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, Customer, StoreProfile, PosCartItem } from '../../types';
import { api } from '../../services/api';
import { barcodeScanner, weighingScale, ThermalPrinterAdapter, ReceiptData, normalizeBarcode } from '../../services/hardware';
import { offlineSync } from '../../services/offlineSync';
import {
  calculateLineItemPricing,
  calculateCartTotals,
  formatDisplayQuantity,
  round2,
  round3,
  isWeightUnit,
  isVolumeUnit,
  AdjustmentMode
} from '../../services/pricingService';
import { LooseItemWeightModal, LooseItemConfirmPayload } from './LooseItemWeightModal';
import { QuickAddItemModal, QuickAddItemPayload } from './QuickAddItemModal';
import { NumericKeypad } from '../common/NumericKeypad';
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
  PlusCircle,
  Percent,
  RefreshCw,
  CheckCircle2,
  Wifi,
  WifiOff,
  Tag,
  ShieldAlert,
  Edit3,
  Camera,
  MessageSquare,
  Send,
  AlertCircle,
  Sparkles,
  Link2,
  FileText,
  History,
  Pause,
  Play,
  Clock,
  TrendingUp,
  Layers
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { NewProductDetectedModal } from './NewProductDetectedModal';
import { UnknownBarcodeModal } from './UnknownBarcodeModal';
import { useLanguage } from '../../context/LanguageContext';

interface POSTerminalProps {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  store: StoreProfile;
  onOpenReceipt: (data: ReceiptData) => void;
  onRefreshData: () => void;
}

export const POSTerminal: React.FC<POSTerminalProps> = ({
  products,
  categories,
  customers,
  store,
  onOpenReceipt,
  onRefreshData,
}) => {
  const { language, t } = useLanguage();
  const [mobilePosTab, setMobilePosTab] = useState<'catalog' | 'billing'>('catalog');
  const [cart, setCart] = useState<PosCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`pos_cart_${store?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Listen to mobile header cart button click
  useEffect(() => {
    const handleOpenCart = () => {
      setMobilePosTab('billing');
    };
    window.addEventListener('pos_open_cart', handleOpenCart);
    return () => window.removeEventListener('pos_open_cart', handleOpenCart);
  }, []);

  // Listen to mobile header cart button click
  useEffect(() => {
    const handleOpenCart = () => {
      setMobilePosTab('billing');
    };
    window.addEventListener('pos_open_cart', handleOpenCart);
    return () => window.removeEventListener('pos_open_cart', handleOpenCart);
  }, []);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerOrderCount, setCustomerOrderCount] = useState<number | null>(null);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Discount
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [discountVal, setDiscountVal] = useState<number>(0);

  // Feature A: Line Item Price Adjustment & Discount Modal State
  const [adjustmentModalItem, setAdjustmentModalItem] = useState<PosCartItem | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('DISCOUNT_PERCENT');
  const [adjustmentInputVal, setAdjustmentInputVal] = useState<string>('10');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Customer negotiation');
  const [showKeypadForAdjustment, setShowKeypadForAdjustment] = useState<boolean>(false);
  const [managerPinInput, setManagerPinInput] = useState<string>('');
  const [managerApprovalNeeded, setManagerApprovalNeeded] = useState<boolean>(false);
  const [managerPinError, setManagerPinError] = useState<string>('');
  const isNoPinWorkflow = store?.pos_no_pin_discount !== false && !store?.require_pos_pin_for_discount;

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Features B, C, D: Dedicated Loose Items Weight & Price Modal
  const [looseModalProduct, setLooseModalProduct] = useState<Product | null>(null);

  // Quick Add Item at Billing Time with live Autocomplete suggestions
  const [isQuickAddItemOpen, setIsQuickAddItemOpen] = useState<boolean>(false);

  // Offline status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(offlineSync.getQueuedOrders().length);

  // Barcode Scanner Listener & Connectivity
  const [scannerReady, setScannerReady] = useState<boolean>(true);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState<boolean>(false);
  const [detectedGlobalProduct, setDetectedGlobalProduct] = useState<{ barcode: string; data?: any } | null>(null);
  const [unknownBarcodePrompt, setUnknownBarcodePrompt] = useState<{ barcode: string } | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  // Active editing order mode (when customer missed an item or needs bill revision)
  const [editingOrder, setEditingOrder] = useState<{
    id: string;
    order_number: string;
    invoice_number: string;
    customer_name: string;
    customer_phone?: string;
    original_total: number;
    payment_method: string;
  } | null>(null);

  // Saved Orders / Recent Bills Modal State
  const [isSavedOrdersModalOpen, setIsSavedOrdersModalOpen] = useState(false);
  const [savedOrdersTab, setSavedOrdersTab] = useState<'recent' | 'held'>('recent');
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [recentBillsSearch, setRecentBillsSearch] = useState('');
  const [isLoadingRecentBills, setIsLoadingRecentBills] = useState(false);
  const [heldOrders, setHeldOrders] = useState<Array<{
    id: string;
    saved_at: string;
    customer_name: string;
    customer_phone: string;
    items_count: number;
    total_amount: number;
    cart: PosCartItem[];
  }>>(() => {
    try {
      const saved = localStorage.getItem(`pos_held_orders_${store?.id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveHeldOrdersToStorage = (updated: typeof heldOrders) => {
    setHeldOrders(updated);
    try {
      localStorage.setItem(`pos_held_orders_${store?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleHoldCurrentCart = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Nothing to hold.');
      return;
    }
    const newHeld = [
      ...heldOrders,
      {
        id: 'hold_' + Date.now(),
        saved_at: new Date().toISOString(),
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone || '',
        items_count: cart.length,
        total_amount: grandTotal,
        cart: [...cart]
      }
    ];
    saveHeldOrdersToStorage(newHeld);
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomer(null);
    setLastScannedFeedback(`⏸️ Order placed on hold (${newHeld.length} held)`);
    setTimeout(() => setLastScannedFeedback(null), 3000);
  };

  const handleResumeHeldCart = (held: typeof heldOrders[0]) => {
    setCart(held.cart);
    setCustomerName(held.customer_name);
    setCustomerPhone(held.customer_phone);
    const updated = heldOrders.filter(h => h.id !== held.id);
    saveHeldOrdersToStorage(updated);
    setIsSavedOrdersModalOpen(false);
    setMobilePosTab('billing');
    setLastScannedFeedback(`▶️ Resumed held order for ${held.customer_name}`);
    setTimeout(() => setLastScannedFeedback(null), 3000);
  };

  const handleDeleteHeldCart = (heldId: string) => {
    const updated = heldOrders.filter(h => h.id !== heldId);
    saveHeldOrdersToStorage(updated);
  };

  const fetchRecentBills = async () => {
    setIsLoadingRecentBills(true);
    try {
      const orders = await api.getOrders({ type: 'POS', limit: 30 });
      setRecentBills(orders);
    } catch (err) {
      console.error('Failed to load recent POS bills:', err);
    } finally {
      setIsLoadingRecentBills(false);
    }
  };

  const handleOpenSavedOrdersModal = () => {
    setIsSavedOrdersModalOpen(true);
    fetchRecentBills();
  };

  const handleLoadOrderForEdit = (order: any) => {
    if (!order.items || order.items.length === 0) {
      alert('This order contains no line items to revise.');
      return;
    }

    const loadedCart: PosCartItem[] = order.items.map((it: any) => {
      const matchingProd = products.find(p => p.id === it.product_id) || {
        id: it.product_id,
        name: it.product_name,
        selling_price: it.unit_price,
        unit: it.unit || 'PACKET',
        is_loose: it.unit === 'KG' || it.unit === 'GRAM' ? 1 : 0,
        purchase_cost: it.cost_price || 0,
        gst_percent: it.gst_percent || 0,
        stock: 50,
        is_active: 1,
        is_pos_available: 1,
        is_visible_online: 1,
      } as Product;

      return {
        product: matchingProd,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || matchingProd.unit,
        original_price: Number(it.original_unit_price || it.unit_price || matchingProd.selling_price),
        unit_price: Number(it.unit_price || matchingProd.selling_price),
        discount_type: it.discount_type || 'FLAT',
        discount_value: Number(it.discount_value) || 0,
        discount_amount: Number(it.discount_amount) || 0,
        total_price: Number(it.total_price) || Math.round(Number(it.quantity) * Number(it.unit_price) * 100) / 100
      };
    });

    setCart(loadedCart);
    setCustomerName(order.customer_name || '');
    setCustomerPhone(order.customer_phone === 'N/A' ? '' : (order.customer_phone || ''));
    setPaymentMethod(order.payment_method || 'CASH');
    setEditingOrder({
      id: order.id,
      order_number: order.order_number,
      invoice_number: order.invoice_number,
      customer_name: order.customer_name || 'Walk-in Customer',
      customer_phone: order.customer_phone,
      original_total: Number(order.total_amount) || 0,
      payment_method: order.payment_method || 'CASH'
    });

    setIsSavedOrdersModalOpen(false);
    setMobilePosTab('billing');
    setLastScannedFeedback(`✏️ Editing Bill #${order.invoice_number} — Add missed items`);
    setTimeout(() => setLastScannedFeedback(null), 4000);
  };

  const handleCancelEditOrder = () => {
    setEditingOrder(null);
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomer(null);
    setLastScannedFeedback('Order editing cancelled');
    setTimeout(() => setLastScannedFeedback(null), 2500);
  };

  const handleUpdateBill = async () => {
    if (!editingOrder) return;
    if (cart.length === 0) {
      alert('Cart is empty. Please add items to update the bill.');
      return;
    }

    setIsProcessing(true);
    try {
      const finalCust = selectedCustomer || (customerPhone.trim() ? { name: customerName.trim() || 'Valued Customer', phone: customerPhone.trim() } : null);

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
          cost_price: it.product.purchase_cost,
          gst_percent: it.product.gst_percent,
        })),
        customer: finalCust,
        discount: cartDiscountAmount,
        payment_method: paymentMethod,
        cashier_name: 'POS Cashier 1',
        notes: `Revised Bill with missed items added. Cash tendered: ₹${cashTendered || grandTotal}`
      };

      const result = await api.updatePosOrder(editingOrder.id, payload);

      const updatedReceipt: ReceiptData = {
        store_name: store?.name || 'Digi8 Kirana Store',
        store_tagline: store?.tagline || '',
        address: store?.address || '',
        phone: store?.phone || '',
        gstin: store?.gstin || '',
        invoice_no: `${result.invoice_number} (Updated)`,
        order_no: result.order_number,
        date_time: new Date().toLocaleString('en-IN'),
        cashier: 'POS Cashier 1',
        customer_name: finalCust?.name || editingOrder.customer_name || 'Walk-in Customer',
        customer_phone: finalCust?.phone || editingOrder.customer_phone || '',
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
        total: result.total_amount,
        payment_method: paymentMethod,
        upi_id: store?.upi_id || 'royalkirana@upi',
        footer_text: 'Thank you! Revised bill with missed items added.',
      };

      onOpenReceipt(updatedReceipt);
      setEditingOrder(null);
      clearCart();
      setCustomerName('');
      setCustomerPhone('');
      setSelectedCustomer(null);
      setMobilePosTab('catalog');
      onRefreshData();
      alert(`✓ Bill #${result.invoice_number} successfully updated! Missed items added, stock synchronized, and updated bill generated.`);
    } catch (err: any) {
      alert('Error updating bill: ' + (err.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReprintReceipt = (order: any) => {
    const receipt: ReceiptData = {
      store_name: store?.name || 'Digi8 Kirana Store',
      store_tagline: store?.tagline || '',
      address: store?.address || '',
      phone: store?.phone || '',
      gstin: store?.gstin || '',
      invoice_no: order.invoice_number,
      order_no: order.order_number,
      date_time: new Date(order.created_at).toLocaleString('en-IN'),
      cashier: 'POS Cashier 1',
      customer_name: order.customer_name || 'Walk-in Customer',
      customer_phone: order.customer_phone || '',
      items: (order.items || []).map((it: any) => ({
        name: it.product_name,
        qty: Number(it.quantity),
        unit: it.unit || 'PACKET',
        rate: Number(it.original_unit_price || it.unit_price),
        discount: Number(it.discount_amount || 0),
        amount: Number(it.total_price),
      })),
      subtotal: Number(order.subtotal || order.total_amount),
      discount: Number(order.discount || 0),
      total: Number(order.total_amount),
      payment_method: order.payment_method || 'CASH',
      upi_id: store?.upi_id || 'royalkirana@upi',
      footer_text: 'Thank you for shopping at ' + (store?.name || 'our store'),
    };
    onOpenReceipt(receipt);
  };

  useEffect(() => {
    if (barcodeScanner && typeof barcodeScanner.onStatusChange === 'function') {
      barcodeScanner.onStatusChange((ready) => {
        setScannerReady(ready);
      });
    }

    barcodeScanner?.connect(
      (scannedCode) => {
        handleBarcodeScanned(scannedCode);
      },
      (ready) => {
        setScannerReady(ready);
      }
    );

    const handleOnline = () => {
      setIsOnline(true);
      handleSyncOfflineOrders();
    };
    const handleOffline = () => setIsOnline(false);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsQuickAddItemOpen(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('keydown', handleGlobalKeyDown);

    // Cache products locally for offline resilience
    offlineSync.cacheProducts(products);

    return () => {
      barcodeScanner.disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [products]);

  // Dedicated Barcode Input State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  const processFoundProduct = (prod: Product, weightedQty?: number) => {
    // Check if inactive
    if (!prod.is_active) {
      setStockWarning(`Product "${prod.name}" is currently inactive/disabled.`);
      return;
    }

    // Check stock status (Level 1: Out of stock vs Not Found distinction)
    if (prod.stock <= 0 && !prod.is_loose && prod.unit !== 'KG') {
      setStockWarning(`Notice: "${prod.name}" is currently OUT OF STOCK (Stock: 0). Added to cart.`);
    }

    setLastScannedFeedback(`✓ Added ${prod.name}`);
    setTimeout(() => setLastScannedFeedback(null), 2500);

    if (weightedQty && weightedQty > 0) {
      // Barcode with embedded weight (e.g. 2.350 KG)
      addToCart(prod, weightedQty);
    } else if (prod.is_loose || prod.category_id === 'cat_loose_items' || ['KG', 'GRAM', 'LITRE', 'ML'].includes((prod.unit || '').toUpperCase())) {
      openLooseItemModal(prod);
    } else {
      addToCart(prod, 1);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    const cleanCode = normalizeBarcode(barcode);
    if (!cleanCode) return;

    setIsBarcodeLoading(true);
    setNetworkError(null);
    setStockWarning(null);

    // Check local loaded store products first for instant zero-latency addition
    const localMatch = products.find(p => p.barcode === cleanCode || (p.sku && p.sku === cleanCode));
    if (localMatch) {
      processFoundProduct(localMatch);
      setIsBarcodeLoading(false);
      return;
    }

    // Level 1-3 Backend Pipeline: Store Catalog -> Global FMCG Catalog -> External Provider
    try {
      const res = await api.lookupBarcode(cleanCode);

      if (res && res.found) {
        if (res.source === 'tenant_catalog' && res.product) {
          processFoundProduct(res.product, res.is_weighted_barcode ? res.parsed_weight : undefined);
        } else if (res.source === 'global_catalog' || res.source === 'external_provider') {
          // Product recognized in Global/External database!
          setDetectedGlobalProduct({
            barcode: cleanCode,
            data: res.global_product
          });
        }
      } else {
        // Completely unknown barcode -> trigger quick create or search & assign
        setUnknownBarcodePrompt({ barcode: cleanCode });
      }
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      const isNetworkOutage = !navigator.onLine || 
                              err?.message?.includes('Failed to fetch') || 
                              err?.name === 'TypeError' ||
                              err?.message?.includes('NetworkError');

      if (isNetworkOutage) {
        setNetworkError('Unable to connect to Digi8 Kirana server. Check your network, Wi-Fi, or local connection.');
      } else {
        setUnknownBarcodePrompt({ barcode: cleanCode });
      }
    } finally {
      setIsBarcodeLoading(false);
    }
  };

  const handleAutoProductCreated = (newProduct: Product) => {
    onRefreshData();
    processFoundProduct(newProduct);
    setDetectedGlobalProduct(null);
    setUnknownBarcodePrompt(null);
    setLastScannedFeedback(`✓ Created & Added ${newProduct.name}`);
    setTimeout(() => setLastScannedFeedback(null), 3000);
  };

  const handleBarcodeAssigned = (product: Product) => {
    onRefreshData();
    processFoundProduct(product);
    setUnknownBarcodePrompt(null);
    setLastScannedFeedback(`✓ Barcode Linked & Added ${product.name}`);
    setTimeout(() => setLastScannedFeedback(null), 3000);
  };

  const handleCustomerPhoneChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(clean);

    if (clean.length === 10) {
      setIsLookingUpCustomer(true);
      try {
        const res = await api.lookupCustomerByMobile(clean);
        if (res.customer) {
          setSelectedCustomer(res.customer);
          setCustomerName(res.customer.name);
          setCustomerOrderCount(res.previousOrdersCount);
        } else {
          setCustomerOrderCount(0);
          setSelectedCustomer(null);
        }
      } catch (err) {
        console.error('Customer lookup error:', err);
      } finally {
        setIsLookingUpCustomer(false);
      }
    } else {
      setCustomerOrderCount(null);
      if (selectedCustomer && selectedCustomer.phone !== clean) {
        setSelectedCustomer(null);
      }
    }
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeScanned(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  const openLooseItemModal = (prod: Product) => {
    setLooseModalProduct(prod);
  };

  const handleConfirmLooseItem = (payload: LooseItemConfirmPayload) => {
    setCart(prev => {
      const isCustom = payload.is_manual_price_adjusted || payload.loose_details?.mode === 'MANUAL_TOTAL';
      // Find existing item only if non-custom and exact unit/price matches
      const existingIndex = prev.findIndex(item =>
        !isCustom &&
        !item.is_price_override &&
        item.product.id === payload.product.id &&
        item.unit === payload.unit &&
        Math.abs(item.unit_price - payload.unit_price) < 0.01
      );

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const newQty = round3(existing.quantity + payload.quantity);
        const newBaseQty = round3((existing.base_quantity || existing.quantity) + payload.base_quantity);
        const pricing = calculateLineItemPricing({
          original_price: existing.original_price,
          quantity: newQty,
          unit: existing.unit,
          manual_unit_price: existing.unit_price,
          adjustment_mode: existing.is_price_override ? 'MANUAL_PRICE' : 'NONE',
          gst_percent: existing.product.gst_percent
        });
        const updated: PosCartItem = {
          ...existing,
          quantity: newQty,
          base_quantity: newBaseQty,
          discount_amount: pricing.discount_amount,
          total_price: pricing.taxable_amount,
          tax_amount: pricing.tax_amount
        };
        const copy = [...prev];
        copy[existingIndex] = updated;
        return copy;
      } else {
        const pricing = calculateLineItemPricing({
          original_price: payload.original_price,
          quantity: payload.quantity,
          unit: payload.unit,
          manual_unit_price: payload.unit_price,
          adjustment_mode: payload.is_manual_price_adjusted ? 'MANUAL_PRICE' : 'NONE',
          gst_percent: payload.product.gst_percent
        });
        const newItem: PosCartItem = {
          line_item_id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          product: payload.product,
          quantity: payload.quantity,
          unit: payload.unit,
          base_quantity: payload.base_quantity,
          base_unit: payload.base_unit,
          original_price: payload.original_price,
          unit_price: payload.unit_price,
          discount_type: 'FLAT',
          discount_value: pricing.discount_percent,
          discount_percent: pricing.discount_percent,
          discount_amount: pricing.discount_amount,
          is_price_override: payload.is_manual_price_adjusted,
          price_difference: pricing.price_difference,
          loose_details: payload.loose_details,
          total_price: payload.total_price || pricing.taxable_amount,
          tax_amount: pricing.tax_amount
        };
        return [...prev, newItem];
      }
    });
    setLooseModalProduct(null);
  };

  const handleQuickAddItem = (itemData: QuickAddItemPayload) => {
    const qty = round3(itemData.quantity);
    const unitPrice = round2(itemData.unit_price);
    const origPrice = round2(itemData.original_price);
    const isOverride = itemData.is_price_override || unitPrice !== origPrice;

    const pricing = calculateLineItemPricing({
      original_price: origPrice,
      quantity: qty,
      unit: itemData.unit,
      manual_unit_price: unitPrice,
      adjustment_mode: isOverride ? (unitPrice > origPrice ? 'PRICE_INCREASE' : 'MANUAL_PRICE') : 'NONE',
      gst_percent: itemData.product.gst_percent
    });

    let baseQty = qty;
    let baseUnit = itemData.unit;
    const isWeight = isWeightUnit(itemData.unit);
    const isVolume = isVolumeUnit(itemData.unit);
    if (itemData.unit === 'GRAM') {
      baseQty = round3(qty / 1000);
      baseUnit = 'KG';
    } else if (itemData.unit === 'ML') {
      baseQty = round3(qty / 1000);
      baseUnit = 'LITRE';
    }

    const newItem: PosCartItem = {
      line_item_id: 'cart_quick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      product: itemData.product,
      quantity: qty,
      unit: itemData.unit,
      base_quantity: baseQty,
      base_unit: baseUnit,
      original_price: origPrice,
      unit_price: unitPrice,
      discount_type: pricing.discount_percent > 0 ? 'PERCENT' : 'FLAT',
      discount_value: pricing.discount_percent,
      discount_percent: pricing.discount_percent,
      discount_amount: pricing.discount_amount,
      is_price_override: isOverride,
      is_price_increase: pricing.is_price_increase,
      price_difference: pricing.price_difference,
      price_difference_percent: pricing.price_difference_percent,
      total_price: pricing.taxable_amount,
      tax_amount: pricing.tax_amount,
      loose_details: (isWeight || isVolume || itemData.is_loose) ? {
        mode: 'MANUAL_TOTAL',
        entered_weight: qty,
        entered_unit: itemData.unit,
        agreed_total: pricing.line_total,
      } : undefined
    };

    setCart(prev => [newItem, ...prev]);
    setLastScannedFeedback(`✓ Added "${itemData.product.name}" (₹${unitPrice}) to bill`);
    setTimeout(() => setLastScannedFeedback(null), 3000);
  };

  const addToCart = (product: Product, quantity: number) => {
    const isLoose = product.category_id === 'cat_loose_items' ||
                    Boolean(product.is_loose) ||
                    ['KG', 'GRAM', 'LITRE', 'ML'].includes((product.unit || '').toUpperCase());

    if (isLoose) {
      setLooseModalProduct(product);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.product.id === product.id && !item.is_price_override && !item.loose_details
      );

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + quantity;
        const pricing = calculateLineItemPricing({
          original_price: existing.original_price,
          quantity: newQty,
          unit: existing.unit,
          manual_unit_price: existing.unit_price,
          adjustment_mode: existing.is_price_override ? 'MANUAL_PRICE' : 'NONE',
          gst_percent: existing.product.gst_percent
        });
        const updated: PosCartItem = {
          ...existing,
          quantity: newQty,
          base_quantity: newQty,
          discount_amount: pricing.discount_amount,
          total_price: pricing.taxable_amount,
          tax_amount: pricing.tax_amount
        };
        const copy = [...prev];
        copy[existingIndex] = updated;
        return copy;
      } else {
        const pricing = calculateLineItemPricing({
          original_price: product.selling_price,
          quantity,
          unit: product.unit,
          adjustment_mode: 'NONE',
          gst_percent: product.gst_percent
        });
        const newItem: PosCartItem = {
          line_item_id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          product,
          quantity,
          unit: product.unit,
          base_quantity: quantity,
          base_unit: product.unit,
          original_price: product.selling_price,
          unit_price: product.selling_price,
          discount_type: 'FLAT',
          discount_value: 0,
          discount_amount: 0,
          is_price_override: false,
          total_price: pricing.taxable_amount,
          tax_amount: pricing.tax_amount
        };
        return [...prev, newItem];
      }
    });
  };

  const updateCartItemQty = (lineItemIdOrProdId: string, newQty: number) => {
    if (newQty <= 0.0001) {
      removeCartItem(lineItemIdOrProdId);
      return;
    }
    setCart(prev => prev.map(it => {
      const isTarget = it.line_item_id === lineItemIdOrProdId || it.product.id === lineItemIdOrProdId;
      if (!isTarget) return it;

      const rounded = round3(newQty);
      let baseQty = rounded;
      if (it.loose_details) {
        const ratio = it.quantity > 0 ? rounded / it.quantity : 1;
        baseQty = round3((it.base_quantity || rounded) * ratio);
      }
      const pricing = calculateLineItemPricing({
        original_price: it.original_price,
        quantity: rounded,
        unit: it.unit,
        manual_unit_price: it.unit_price,
        adjustment_mode: it.is_price_override ? (it.is_price_increase ? 'PRICE_INCREASE' : 'MANUAL_PRICE') : 'NONE',
        gst_percent: it.product.gst_percent
      });
      return {
        ...it,
        quantity: rounded,
        base_quantity: baseQty,
        discount_amount: pricing.discount_amount,
        price_difference: pricing.price_difference,
        total_price: pricing.taxable_amount,
        tax_amount: pricing.tax_amount
      };
    }));
  };

  const openPriceAdjustmentModal = (item: PosCartItem) => {
    setAdjustmentModalItem(item);
    if (item.is_price_increase) {
      setAdjustmentMode('PRICE_INCREASE');
      setAdjustmentInputVal(String(item.unit_price));
    } else if (item.is_price_override) {
      setAdjustmentMode('MANUAL_PRICE');
      setAdjustmentInputVal(String(item.unit_price));
    } else if (item.discount_percent && item.discount_percent > 0) {
      setAdjustmentMode('DISCOUNT_PERCENT');
      setAdjustmentInputVal(String(item.discount_percent));
    } else {
      setAdjustmentMode('DISCOUNT_PERCENT');
      setAdjustmentInputVal('10');
    }
    setAdjustmentReason(item.discount_reason || 'Customer negotiation');
    setShowKeypadForAdjustment(false);
    setManagerPinInput('');
    setManagerApprovalNeeded(false);
    setManagerPinError('');
  };

  const handleApplyItemAdjustment = () => {
    if (!adjustmentModalItem) return;
    const numVal = parseFloat(adjustmentInputVal) || 0;
    const pricing = calculateLineItemPricing({
      original_price: adjustmentModalItem.original_price,
      quantity: adjustmentModalItem.quantity,
      unit: adjustmentModalItem.unit,
      adjustment_mode: adjustmentMode,
      discount_percent: adjustmentMode === 'DISCOUNT_PERCENT' ? numVal : undefined,
      manual_unit_price: adjustmentMode !== 'DISCOUNT_PERCENT' ? numVal : undefined,
      gst_percent: adjustmentModalItem.product.gst_percent
    });

    // Check if store strictly requires PIN (by default in normal workflow, isNoPinWorkflow is TRUE)
    if (!isNoPinWorkflow && pricing.discount_percent > (store?.cashier_max_discount || 5)) {
      if (!managerApprovalNeeded) {
        setManagerApprovalNeeded(true);
        setManagerPinError(`Discount exceeds cashier limit. Enter Manager PIN to approve.`);
        return;
      }
      if (!managerPinInput || managerPinInput.length < 4) {
        setManagerPinError('Please enter a valid 4-digit Manager PIN.');
        return;
      }
    }

    setCart(prev => prev.map(it => {
      const isTarget = (adjustmentModalItem.line_item_id && it.line_item_id === adjustmentModalItem.line_item_id) ||
        (!adjustmentModalItem.line_item_id && it.product.id === adjustmentModalItem.product.id);
      if (!isTarget) return it;

      return {
        ...it,
        unit_price: pricing.unit_price,
        discount_type: 'PERCENT',
        discount_value: pricing.discount_percent,
        discount_percent: pricing.discount_percent,
        discount_amount: pricing.discount_amount,
        is_price_override: pricing.is_manual_price_adjusted,
        is_price_increase: pricing.is_price_increase,
        price_difference: pricing.price_difference,
        price_difference_percent: pricing.price_difference_percent,
        discount_reason: adjustmentReason,
        manager_pin_approved: managerApprovalNeeded,
        manager_pin: managerApprovalNeeded ? managerPinInput : undefined,
        total_price: pricing.taxable_amount,
        tax_amount: pricing.tax_amount
      };
    }));

    setAdjustmentModalItem(null);
    setShowKeypadForAdjustment(false);
  };

  const removeCartItem = (lineItemIdOrProdId: string) => {
    setCart(prev => prev.filter(it => it.line_item_id !== lineItemIdOrProdId && it.product.id !== lineItemIdOrProdId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerOrderCount(null);
    setDiscountVal(0);
    setCashTendered('');
  };

  // Authoritative Pricing & Totals via pricingService
  const cartTotals = calculateCartTotals({
    items: cart.map(it => ({
      original_price: it.original_price,
      unit_price: it.unit_price,
      quantity: it.quantity,
      unit: it.unit,
      adjustment_mode: it.is_price_increase ? 'PRICE_INCREASE' : (it.is_price_override ? 'MANUAL_PRICE' : 'NONE'),
      discount_percent: it.discount_percent || 0,
      discount_amount: it.discount_amount || 0,
      is_price_increase: Boolean(it.is_price_increase),
      price_difference: it.price_difference || 0,
      price_difference_percent: it.price_difference_percent || 0,
      is_manual_price_adjusted: Boolean(it.is_price_override),
      taxable_amount: it.total_price,
      gst_percent: it.product.gst_percent || 0,
      tax_amount: it.tax_amount || 0,
      line_total: it.total_price + (it.tax_amount || 0)
    })),
    bill_discount_type: discountType,
    bill_discount_value: discountVal
  });

  const grossSubtotal = cartTotals.gross_subtotal;
  const totalItemDiscounts = cartTotals.total_item_discounts;
  const netItemSubtotal = cartTotals.net_item_subtotal;
  const cartDiscountAmount = cartTotals.bill_discount_amount;
  const grandTotal = cartTotals.grand_total;
  const totalSavings = cartTotals.total_savings;
  const totalTax = cartTotals.total_tax;
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);

  // Automatically persist draft cart to localStorage and broadcast real-time count
  useEffect(() => {
    try {
      const storageKey = `pos_cart_${store?.id || 'default'}`;
      if (cart.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(cart));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {}

    const totalQty = cart.reduce((sum, it) => sum + (it.product.is_loose || it.unit === 'KG' ? 1 : Math.round(it.quantity)), 0);
    window.dispatchEvent(new CustomEvent('pos_cart_updated', {
      detail: {
        uniqueCount: cart.length,
        totalQuantity: totalQty,
        grandTotal
      }
    }));
  }, [cart, grandTotal, store?.id]);

  // Complete POS Transaction & Print
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    const finalCust = selectedCustomer || (customerPhone.trim() ? { name: customerName.trim() || 'Valued Customer', phone: customerPhone.trim() } : null);

    if (paymentMethod === 'CREDIT' && !finalCust) {
      alert('Please enter or select a customer to record Khata (Store Credit / Udhar)');
      return;
    }

    setIsProcessing(true);

    const payload = {
      items: cart.map(it => ({
        product_id: it.product.id,
        product_name: it.product.name,
        unit: it.unit,
        quantity: it.quantity,
        base_quantity: it.base_quantity !== undefined ? it.base_quantity : it.quantity,
        base_unit: it.base_unit || it.unit,
        original_price: it.original_price,
        unit_price: it.unit_price,
        discount_type: it.discount_type || 'FLAT',
        discount_value: it.discount_value || 0,
        discount_amount: it.discount_amount || 0,
        discount_reason: it.discount_reason || null,
        is_price_override: it.is_price_override ? 1 : 0,
        is_price_increase: it.is_price_increase ? 1 : 0,
        price_difference: it.price_difference || 0,
        manual_price_adjusted: it.is_price_override ? 1 : 0,
        manager_pin_approved: it.manager_pin_approved ? 1 : 0,
        manager_pin: it.manager_pin || null,
        cost_price: it.product.purchase_cost,
        gst_percent: it.product.gst_percent,
      })),
      customer: finalCust,
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
        store_name: store?.name || 'Digi8 Kirana Store',
        store_tagline: store?.tagline || '',
        address: store?.address || '',
        phone: store?.phone || '',
        gstin: store?.gstin || '',
        invoice_no: billResult.invoice_number,
        order_no: billResult.order_number,
        date_time: new Date().toLocaleString('en-IN'),
        cashier: 'POS Cashier 1',
        customer_name: finalCust?.name || 'Walk-in Customer',
        customer_phone: finalCust?.phone || '',
        items: cart.map(it => {
          const displayQtyStr = formatDisplayQuantity(it.quantity, it.unit);
          return {
            name: it.product.name + (it.loose_details?.entered_unit && it.loose_details.entered_unit !== it.unit ? ` (${it.loose_details.entered_weight} ${it.loose_details.entered_unit})` : ''),
            qty: it.quantity,
            unit: it.unit,
            rate: it.unit_price,
            discount: it.discount_amount || 0,
            amount: it.total_price,
          };
        }),
        subtotal: grossSubtotal,
        discount: totalSavings,
        total: grandTotal,
        payment_method: paymentMethod,
        upi_id: store?.upi_id || 'apnakirana@okhdfcbank',
        footer_text: 'Thank you for shopping at ' + (store?.name || 'our store'),
      };

      // Phase 6: WhatsApp dispatch if customer mobile is present
      const invoiceNum = billResult.invoice_number;
      const targetPhone = finalCust?.phone;
      if (invoiceNum && targetPhone) {
        api.sendInvoiceWhatsApp(invoiceNum, targetPhone).then(res => {
          console.log('[Auto WhatsApp Invoice Sent]:', res);
        }).catch(waErr => {
          console.warn('[Auto WhatsApp Notice - Sale remains PAID]:', waErr);
        });
      }

      // Open receipt modal for thermal printing
      onOpenReceipt(receipt);
      clearCart();
      setMobilePosTab('catalog');
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

  // Filter products for touch grid with robust null/undefined safety
  const filteredProducts = (products || []).filter(p => {
    if (!p) return false;
    const s = (search || '').toLowerCase();
    const nameMatch = Boolean(p.name && p.name.toLowerCase().includes(s));
    const barcodeMatch = Boolean(p.barcode && String(p.barcode).toLowerCase().includes(s));
    const brandMatch = Boolean(p.brand && String(p.brand).toLowerCase().includes(s));
    const matchesSearch = !s || nameMatch || barcodeMatch || brandMatch;
    const matchesCat = selectedCategory === '' || p.category_id === selectedCategory;
    const isAvailableInPos = p.is_pos_available === undefined || p.is_pos_available === null || Number(p.is_pos_available) === 1 || p.is_pos_available === true;
    const isActive = p.is_active === undefined || p.is_active === null || Number(p.is_active) === 1 || p.is_active === true || (p as any).status === 'ACTIVE';
    return matchesSearch && matchesCat && isAvailableInPos && isActive;
  });

  return (
    <div className={`pos-layout ${mobilePosTab === 'catalog' ? 'pos-mobile-show-catalog' : 'pos-mobile-show-billing'}`}>
      {/* LEFT: Catalog Grid & Search */}
      <div className="pos-catalog-panel">
        {/* Scan Alerts: Distinguish Network Error vs Inactive/Stock */}
        {networkError && (
          <div style={{
            background: '#fef2f2',
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
              <WifiOff size={18} />
              <span>{networkError}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setNetworkError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {stockWarning && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: '#92400e'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#d97706" />
              <span>{stockWarning}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStockWarning(null)}
            >
              Dismiss
            </button>
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
              placeholder={language === 'te' ? 'సరుకు పేరు లేదా బ్రాండ్‌తో వెతకండి...' : 'Search by name or brand...'}
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

          {/* Quick Add Item at Billing Time */}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsQuickAddItemOpen(true)}
            title={language === 'te' ? 'బిల్లు సమయంలో కొత్త సరుకును చేర్చండి (F2)' : 'Add new item to bill (F2)'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <PlusCircle size={16} />
            <span>{language === 'te' ? '+ కొత్త సరుకు (F2)' : '+ New Item (F2)'}</span>
          </button>

          {/* Dedicated Barcode Scanner Input Form */}
          <form
            onSubmit={handleManualBarcodeSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'white',
              border: isBarcodeLoading ? '2px solid #3b82f6' : '2px solid var(--primary-500)',
              borderRadius: 'var(--radius-md)',
              padding: '2px 8px',
              flex: '1 1 260px',
              transition: 'border 0.2s ease'
            }}
          >
            <Barcode size={18} color="var(--primary-700)" style={{ marginRight: '6px' }} />
            <input
              type="text"
              placeholder={language === 'te' ? 'బార్‌కోడ్ స్కాన్ చేయండి / కోడ్ నమోదు...' : 'Scan Barcode / Enter Code...'}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              disabled={isBarcodeLoading}
              style={{ border: 'none', width: '100%', fontSize: '0.85rem', outline: 'none' }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isBarcodeLoading}
              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isBarcodeLoading ? (
                <>
                  <RefreshCw size={12} className="spin" />
                  <span>{language === 'te' ? 'వెతుకుతోంది...' : 'Looking up...'}</span>
                </>
              ) : (
                <span>{language === 'te' ? 'స్కాన్' : 'Scan'}</span>
              )}
            </button>
          </form>

          {/* PHASE 6: Mobile / Tablet Camera Barcode Scanner Trigger */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsCameraScannerOpen(true)}
            title={language === 'te' ? 'కెమెరాతో బార్‌కోడ్ స్కాన్ చేయండి' : 'Scan barcode with mobile camera'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e0f2fe',
              color: '#0369a1',
              borderColor: '#bae6fd',
              fontWeight: 600
            }}
          >
            <Camera size={16} />
            <span>{language === 'te' ? 'కెమెరా స్కాన్' : 'Camera Scan'}</span>
          </button>

          {/* Barcode scanner active badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: scannerReady ? '#ecfdf5' : '#fef2f2',
            color: scannerReady ? '#065f46' : '#991b1b',
            border: `1px solid ${scannerReady ? '#a7f3d0' : '#fecaca'}`,
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: scannerReady ? '#10b981' : '#ef4444',
              display: 'inline-block',
              boxShadow: scannerReady ? '0 0 6px #10b981' : 'none'
            }} />
            <Barcode size={16} />
            <span>
              {scannerReady 
                ? (language === 'te' ? 'స్కానర్ సిద్ధంగా ఉంది' : 'Scanner Ready')
                : (language === 'te' ? 'స్కానర్ నిష్క్రియంగా ఉంది' : 'Scanner Inactive')}
            </span>
          </div>

          {/* Saved Orders & Recent Bills Trigger */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenSavedOrdersModal}
            title="View saved held carts and recent completed bills to add missed items or reprint"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              borderColor: '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: '#334155'
            }}
          >
            <History size={15} color="var(--primary-600)" />
            <span>{language === 'te' ? 'సేవ్ చేసిన బిల్లులు' : 'Saved & Recent Bills'}</span>
            {heldOrders.length > 0 && (
              <span style={{
                background: '#f59e0b',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {heldOrders.length}
              </span>
            )}
          </button>

          {/* Offline Sync Status */}
          {offlineQueueCount > 0 && (
            <button
              className="btn btn-accent btn-sm"
              onClick={handleSyncOfflineOrders}
              title="Click to sync offline bills"
            >
              <RefreshCw size={13} />
              <span>
                {language === 'te' ? `${offlineQueueCount} ఆఫ్‌లైన్ బిల్లులను సింక్ చేయండి` : `Sync ${offlineQueueCount} Offline Bills`}
              </span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="pos-category-bar">
          <button
            className={`pos-cat-pill ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            {t.allProducts}
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

        {/* Touch Tiles Grid with Visual Selected States & Direct Quantity Controls */}
        <div className="pos-grid-items">
          {filteredProducts.map(p => {
            const isLoose = p.category_id === 'cat_loose_items' ||
                            Boolean(p.is_loose) ||
                            ['KG', 'GRAM', 'LITRE', 'ML'].includes((p.unit || '').toUpperCase());
            const cartItem = cart.find(it => it.product.id === p.id);
            const isSelected = Boolean(cartItem && cartItem.quantity > 0);
            const selectedQty = cartItem ? cartItem.quantity : 0;
            const step = isLoose ? 0.250 : 1;

            return (
              <div
                key={p.id}
                className={`pos-item-tile ${isSelected ? 'selected' : ''} ${isLoose ? 'pos-loose-tile' : ''}`}
                onClick={() => {
                  if (isLoose) openLooseItemModal(p);
                  else addToCart(p, 1);
                }}
              >
                {/* Loose good badge */}
                {isLoose && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    zIndex: 2
                  }}>
                    ⚖️ Loose
                  </div>
                )}

                {/* Visual selected indicator with checkmark */}
                {isSelected && (
                  <div className="pos-tile-selected-badge">
                    <span>✓</span>
                    <span>{isLoose ? formatDisplayQuantity(selectedQty, cartItem?.unit || p.unit) : `${selectedQty} in Cart`}</span>
                  </div>
                )}

                <img src={p.photo_url} alt={p.name} className="pos-tile-img" />
                <div className="pos-tile-name" title={p.name}>{p.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {isLoose ? `Per ${p.unit || 'KG'} (Loose)` : `1 ${p.unit}`}
                </div>
                <div className="pos-tile-price">
                  ₹{p.selling_price}
                </div>

                {/* Direct Stepper when selected or Add button when unselected */}
                {isSelected ? (
                  <div className="pos-tile-stepper" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="pos-stepper-btn minus"
                      onClick={() => updateCartItemQty(cartItem?.line_item_id || p.id, selectedQty - step)}
                      aria-label={`Decrease ${p.name}`}
                    >
                      -
                    </button>
                    <span className="pos-stepper-qty" style={{ fontSize: isLoose ? '0.72rem' : '0.8rem' }}>
                      {isLoose ? formatDisplayQuantity(selectedQty, cartItem?.unit || p.unit) : selectedQty}
                    </span>
                    <button
                      type="button"
                      className="pos-stepper-btn plus"
                      onClick={() => {
                        if (isLoose) openLooseItemModal(p);
                        else addToCart(p, 1);
                      }}
                      aria-label={`Increase ${p.name}`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="pos-tile-add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLoose) openLooseItemModal(p);
                      else addToCart(p, 1);
                    }}
                  >
                    {isLoose ? '⚖️ Weight' : '+ Add'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Zepto-Style Bottom Floating Bar (Appears when items are in cart) */}
        {cart.length > 0 && (
          <div className="pos-mobile-zepto-bar">
            <div className="pos-zepto-summary">
              <span className="pos-zepto-badge">
                🛒 {cart.length} {cart.length === 1 ? 'Product' : 'Products'} • {cart.reduce((s, i) => s + (i.product.is_loose || i.unit === 'KG' ? 1 : Math.round(i.quantity)), 0)} {cart.reduce((s, i) => s + (i.product.is_loose || i.unit === 'KG' ? 1 : Math.round(i.quantity)), 0) === 1 ? 'Unit' : 'Units'}
              </span>
              <span className="pos-zepto-price">₹{grandTotal.toFixed(2)}</span>
              <span className="pos-zepto-sub">Tap to review cart & checkout</span>
            </div>
            <button
              type="button"
              className="btn btn-primary pos-zepto-pay-btn"
              onClick={() => setMobilePosTab('billing')}
            >
              VIEW CART →
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Active Billing Cart & Payment Panel */}
      <div className="pos-billing-panel">
        {/* Mobile: Back to Catalog Bar */}
        <div className="pos-mobile-back-bar">
          <button
            type="button"
            className="pos-zepto-back-btn"
            onClick={() => setMobilePosTab('catalog')}
          >
            ← + Add More Products (Cart Preserved)
          </button>
        </div>
        {/* Cashier Bar */}
        <div className="pos-bill-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>⚡ Counter Bill</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({cart.length} items)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-sm"
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 10px',
                fontSize: '0.78rem'
              }}
              onClick={() => setIsQuickAddItemOpen(true)}
              title="Add item directly to bill"
            >
              <PlusCircle size={13} /> {language === 'te' ? '+ సరుకు' : '+ Item'}
            </button>
            {cart.length > 0 && !editingOrder && (
              <button
                type="button"
                className="btn-sm btn-secondary"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleHoldCurrentCart}
                title="Hold current cart to bill another customer"
              >
                <Pause size={13} /> {language === 'te' ? 'హోల్డ్' : 'Hold'}
              </button>
            )}
            <button
              className="btn-sm btn-secondary"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'transparent' }}
              onClick={editingOrder ? handleCancelEditOrder : clearCart}
            >
              {editingOrder ? 'Cancel' : 'Clear'}
            </button>
          </div>
        </div>

        {/* REVISION MODE BANNER */}
        {editingOrder && (
          <div style={{
            background: '#fef3c7',
            borderBottom: '2px solid #f59e0b',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                <Edit3 size={16} /> REVISING BILL #{editingOrder.invoice_number}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.75rem', height: '24px', background: 'white' }}
                onClick={handleCancelEditOrder}
              >
                ✕ Cancel Revision
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#78350f' }}>
              Add missed products from catalog or scanner. When finished, click <strong>"UPDATE & RE-PRINT BILL"</strong> to reconcile stock and reprint.
            </div>
            <div style={{ fontSize: '0.75rem', color: '#92400e', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Customer: {editingOrder.customer_name}</span>
              <span>Original Total: ₹{editingOrder.original_total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* PHASE 6: CUSTOMER NAME & MOBILE NUMBER CAPTURE (TENANT ISOLATED) */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                CUSTOMER MOBILE
              </div>
              <input
                type="tel"
                placeholder="10-digit Mobile..."
                maxLength={10}
                value={customerPhone}
                onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.825rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div style={{ flex: 1.2 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                CUSTOMER NAME
              </div>
              <input
                type="text"
                placeholder="Customer Name..."
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (selectedCustomer) {
                    setSelectedCustomer({ ...selectedCustomer, name: e.target.value });
                  }
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.825rem'
                }}
              />
            </div>
          </div>

          {/* Customer Lookup & Khata Status Badges */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
            {isLookingUpCustomer ? (
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={12} className="animate-spin" /> Searching customer...
              </span>
            ) : selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  ✓ Existing Customer ({customerOrderCount ?? 0} orders)
                </span>
                {selectedCustomer.credit_balance > 0 && (
                  <span style={{ color: '#ea580c', fontWeight: 700 }}>
                    Udhar: ₹{selectedCustomer.credit_balance}
                  </span>
                )}
              </div>
            ) : customerPhone.length === 10 ? (
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                + New Customer (Will auto-save)
              </span>
            ) : (
              <span style={{ color: '#94a3b8' }}>
                Walk-in Customer
              </span>
            )}

            {/* Quick dropdown for existing registered customers */}
            {customers.length > 0 && (
              <select
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.72rem',
                  color: '#475569',
                  cursor: 'pointer',
                  maxWidth: '120px'
                }}
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const c = customers.find(cust => cust.id === e.target.value);
                  if (c) {
                    setSelectedCustomer(c);
                    setCustomerPhone(c.phone);
                    setCustomerName(c.name);
                  } else {
                    setSelectedCustomer(null);
                  }
                }}
              >
                <option value="">Select list...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Cart Line Items */}
        <div className="pos-cart-items-list">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛒</div>
              <p style={{ fontWeight: 700 }}>
                {language === 'te' ? 'బార్‌కోడ్ స్కాన్ చేయండి లేదా ఎడమవైపు వస్తువులను ఎంచుకోండి' : 'Scan barcode or click items on the left'}
              </p>
            </div>
          ) : (
            cart.map(item => {
              const itemId = item.line_item_id || item.product.id;
              const isLoose = item.product.category_id === 'cat_loose_items' ||
                              Boolean(item.product.is_loose) ||
                              Boolean(item.loose_details) ||
                              ['KG', 'GRAM', 'LITRE', 'ML'].includes((item.unit || '').toUpperCase());
              const step = isLoose ? 0.250 : 1;
              const hasDiscount = Boolean(item.discount_amount && item.discount_amount > 0 && !item.is_price_increase);
              const isIncreased = Boolean(item.is_price_increase && item.price_difference && item.price_difference > 0);
              const isPriceOverridden = Boolean(item.is_price_override || hasDiscount || isIncreased);

              return (
                <div
                  key={itemId}
                  className="pos-cart-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.45fr) auto auto auto',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderBottom: '1px solid #e2e8f0',
                    background: isPriceOverridden ? '#fcfbf7' : 'white',
                    borderRadius: '6px',
                    marginBottom: '4px'
                  }}
                >
                  {/* Product Details, Loose Weight Badge & Price Adjustment Summary */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>{item.product.name}</strong>
                      {isLoose && (
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          fontSize: '0.66rem',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 700
                        }}>
                          ⚖️ {formatDisplayQuantity(item.quantity, item.unit)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', marginTop: '2px', flexWrap: 'wrap' }}>
                      {/* Original vs Adjusted Selling Price */}
                      {isPriceOverridden ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.7rem' }}>
                            ₹{item.original_price.toFixed(2)}
                          </span>
                          <span style={{ fontWeight: 800, color: hasDiscount ? '#059669' : '#b45309' }}>
                            ₹{item.unit_price.toFixed(2)}/{item.unit}
                          </span>
                          {hasDiscount && (
                            <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.67rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              -{item.discount_percent ? item.discount_percent.toFixed(1) : ((item.discount_amount! / (item.quantity * item.original_price)) * 100).toFixed(1)}% (-₹{item.discount_amount?.toFixed(2)})
                            </span>
                          )}
                          {isIncreased && (
                            <span style={{ background: '#fff7ed', color: '#c2410c', fontSize: '0.67rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              +{item.price_difference_percent ? item.price_difference_percent.toFixed(1) : ''}% (+₹{item.price_difference?.toFixed(2)})
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#475569', fontWeight: 600 }}>
                          ₹{item.unit_price.toFixed(2)}/{item.unit}
                        </span>
                      )}

                      {/* Edit Price Action Button */}
                      <button
                        type="button"
                        onClick={() => openPriceAdjustmentModal(item)}
                        title="Manual percentage discount or price adjustment (No PIN required)"
                        style={{
                          background: isPriceOverridden ? '#fef3c7' : '#f1f5f9',
                          border: isPriceOverridden ? '1px solid #fde68a' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          color: isPriceOverridden ? '#b45309' : '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={10} />
                        {isPriceOverridden ? 'Edit Rate' : 'Edit Price'}
                      </button>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <button
                      type="button"
                      className="btn-icon btn-secondary"
                      style={{ width: '25px', height: '25px', padding: 0, fontSize: '0.9rem', fontWeight: 800 }}
                      onClick={() => updateCartItemQty(itemId, item.quantity - step)}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', minWidth: '44px', textAlign: 'center' }}>
                      {isLoose ? formatDisplayQuantity(item.quantity, item.unit) : item.quantity}
                    </span>
                    <button
                      type="button"
                      className="btn-icon btn-secondary"
                      style={{ width: '25px', height: '25px', padding: 0, fontSize: '0.9rem', fontWeight: 800 }}
                      onClick={() => updateCartItemQty(itemId, item.quantity + step)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Final Line Total */}
                  <div style={{ textAlign: 'right', minWidth: '55px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                      ₹{item.total_price.toFixed(2)}
                    </div>
                    {item.tax_amount && item.tax_amount > 0 ? (
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        +₹{item.tax_amount.toFixed(2)} tax
                      </div>
                    ) : null}
                  </div>

                  {/* Remove Item Action */}
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ color: '#ef4444', width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    onClick={() => removeCartItem(itemId)}
                    aria-label={`Remove ${item.product.name}`}
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
            <span>{language === 'te' ? 'స్థూల మొత్తం:' : 'Gross Subtotal:'}</span>
            <span>₹{grossSubtotal.toFixed(2)}</span>
          </div>

          {totalItemDiscounts > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#059669', marginBottom: '3px' }}>
              <span>{language === 'te' ? 'సరుకుల రాయితీలు:' : 'Item Discounts:'}</span>
              <span>-₹{totalItemDiscounts.toFixed(2)}</span>
            </div>
          )}

          {/* Bill-level Discount Field */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.825rem' }}>{language === 'te' ? 'బిల్ రాయితీ:' : 'Bill Discount:'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                style={{ padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                <option value="FLAT">{language === 'te' ? '₹ మొత్తం' : '₹ Flat'}</option>
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
              <span>{language === 'te' ? 'మొత్తం ఆదా:' : 'Total Savings:'}</span>
              <span>₹{totalSavings.toFixed(2)}</span>
            </div>
          )}

          {/* Cash Tendered & Change Return for Cash mode */}
          {paymentMethod === 'CASH' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {t.cashReceived}:
              </span>
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
              <span>{t.balanceReturn}:</span>
              <span>₹{changeDue.toFixed(2)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="pos-grand-total">
            <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
              {language === 'te' ? 'మొత్తం బిల్లు:' : 'Total Due:'}
            </span>
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
            <Banknote size={15} /> {language === 'te' ? 'నగదు' : 'Cash'}
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
            <CreditCard size={15} /> {language === 'te' ? 'కార్డు' : 'Card'}
          </button>
          <button
            className={`btn-sm ${paymentMethod === 'CREDIT' ? 'btn-accent' : 'btn-secondary'}`}
            style={{ padding: '8px 4px', fontSize: '0.75rem', gap: '4px' }}
            onClick={() => setPaymentMethod('CREDIT')}
          >
            {language === 'te' ? 'ఉధార్ (ఖాతా)' : 'Udhar (Khata)'}
          </button>
        </div>

        {/* Final Action Button: Bill & Thermal Print */}
        <div style={{ padding: '12px 20px', background: 'white' }}>
          <button
            className={`btn ${editingOrder ? 'btn-accent' : 'btn-primary'} btn-lg`}
            style={{
              width: '100%',
              gap: '10px',
              background: editingOrder ? '#059669' : undefined,
              borderColor: editingOrder ? '#047857' : undefined
            }}
            disabled={cart.length === 0 || isProcessing}
            onClick={editingOrder ? handleUpdateBill : handleCompleteSale}
          >
            <Printer size={20} />
            <span>
              {isProcessing 
                ? (language === 'te' ? 'ప్రాసెస్ అవుతోంది...' : 'PROCESSING...') 
                : editingOrder
                  ? `UPDATE & RE-PRINT BILL (₹${grandTotal.toFixed(2)})`
                  : (language === 'te' ? `రశీదు ప్రింట్ చేయండి (₹${grandTotal.toFixed(2)})` : `PRINT BILL (₹${grandTotal.toFixed(2)})`)}
            </span>
          </button>
        </div>
      </div>

      {/* ====================================================
          FEATURES B, C, D: DEDICATED LOOSE ITEMS WEIGHT & PRICE MODAL
          ==================================================== */}
      <LooseItemWeightModal
        isOpen={Boolean(looseModalProduct)}
        product={looseModalProduct}
        onClose={() => setLooseModalProduct(null)}
        onConfirm={handleConfirmLooseItem}
      />

      {/* QUICK ADD ITEM AT BILLING TIME WITH LIVE AUTOCOMPLETE SUGGESTIONS */}
      <QuickAddItemModal
        isOpen={isQuickAddItemOpen}
        onClose={() => setIsQuickAddItemOpen(false)}
        catalogProducts={products}
        categories={categories}
        onAddItem={handleQuickAddItem}
        onProductCreated={(_newProd) => {
          onRefreshData();
        }}
        language={language}
        storeId={store?.id}
      />

      {/* ====================================================
          FEATURE A: LINE ITEM PRICE ADJUSTMENT & DISCOUNT MODAL
          ==================================================== */}
      {adjustmentModalItem && (() => {
        const basePrice = adjustmentModalItem.original_price;
        const currentQty = adjustmentModalItem.quantity;
        const rawVal = parseFloat(adjustmentInputVal) || 0;
        const livePricing = calculateLineItemPricing({
          original_price: basePrice,
          quantity: currentQty,
          unit: adjustmentModalItem.unit,
          adjustment_mode: adjustmentMode,
          discount_percent: adjustmentMode === 'DISCOUNT_PERCENT' ? rawVal : undefined,
          manual_unit_price: adjustmentMode !== 'DISCOUNT_PERCENT' ? rawVal : undefined,
          gst_percent: adjustmentModalItem.product.gst_percent
        });

        const isCashierPinEnforced = !isNoPinWorkflow && livePricing.discount_percent > (store?.cashier_max_discount || 5);

        return (
          <div className="modal-backdrop" onClick={() => { setAdjustmentModalItem(null); setShowKeypadForAdjustment(false); }}>
            <div
              className="modal-card"
              style={{ maxWidth: '500px', width: '95%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={20} color="var(--primary-700)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                      Adjust Line Price &amp; Discount
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                      Fast POS price override — No manager PIN required for cashier adjustments
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-icon btn-secondary"
                  onClick={() => { setAdjustmentModalItem(null); setShowKeypadForAdjustment(false); }}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ padding: '16px 18px' }}>
                {/* Product Meta Header */}
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {adjustmentModalItem.product.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>Catalog Rate: <strong style={{ color: '#0f172a' }}>₹{basePrice.toFixed(2)} / {adjustmentModalItem.unit}</strong></span>
                    <span>Quantity: <strong style={{ color: '#0f172a' }}>{formatDisplayQuantity(currentQty, adjustmentModalItem.unit)}</strong></span>
                  </div>
                </div>

                {/* Adjustment Mode Selection: 3 Options as required */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentMode('DISCOUNT_PERCENT');
                      setAdjustmentInputVal('10');
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      border: adjustmentMode === 'DISCOUNT_PERCENT' ? '2px solid var(--primary-700)' : '1px solid #cbd5e1',
                      background: adjustmentMode === 'DISCOUNT_PERCENT' ? '#ecfdf5' : '#fff',
                      color: adjustmentMode === 'DISCOUNT_PERCENT' ? 'var(--primary-800)' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    % Discount
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentMode('MANUAL_PRICE');
                      setAdjustmentInputVal(String(livePricing.unit_price > 0 ? livePricing.unit_price : Math.max(1, basePrice - 10)));
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      border: adjustmentMode === 'MANUAL_PRICE' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: adjustmentMode === 'MANUAL_PRICE' ? '#eff6ff' : '#fff',
                      color: adjustmentMode === 'MANUAL_PRICE' ? '#1d4ed8' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    ₹ Custom Rate
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentMode('PRICE_INCREASE');
                      setAdjustmentInputVal(String(basePrice + 10));
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      border: adjustmentMode === 'PRICE_INCREASE' ? '2px solid #d97706' : '1px solid #cbd5e1',
                      background: adjustmentMode === 'PRICE_INCREASE' ? '#fffbeb' : '#fff',
                      color: adjustmentMode === 'PRICE_INCREASE' ? '#b45309' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    + Price Increase
                  </button>
                </div>

                {/* Option 1: Discount Percentage */}
                {adjustmentMode === 'DISCOUNT_PERCENT' && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        Discount Percentage (%)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                        Discounted Rate: ₹{livePricing.unit_price.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={adjustmentInputVal}
                        onChange={(e) => setAdjustmentInputVal(e.target.value)}
                        placeholder="e.g. 10"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '2px solid #cbd5e1',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          textAlign: 'center'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowKeypadForAdjustment(prev => !prev)}
                        style={{ padding: '0 12px', fontWeight: 700 }}
                      >
                        ⌨️ Keypad
                      </button>
                    </div>

                    {/* Quick percentage presets */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[5, 10, 12.5, 15, 20, 25].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAdjustmentInputVal(String(pct))}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: parseFloat(adjustmentInputVal) === pct ? '2px solid var(--primary-700)' : '1px solid #cbd5e1',
                            background: parseFloat(adjustmentInputVal) === pct ? '#ecfdf5' : '#f8fafc',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: parseFloat(adjustmentInputVal) === pct ? 'var(--primary-800)' : '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option 2: Manual Selling Price */}
                {adjustmentMode === 'MANUAL_PRICE' && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        Custom Selling Unit Price (₹ / {adjustmentModalItem.unit})
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>
                        Original: ₹{basePrice.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={adjustmentInputVal}
                        onChange={(e) => setAdjustmentInputVal(e.target.value)}
                        placeholder={`e.g. ${basePrice - 10}`}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '2px solid #cbd5e1',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          textAlign: 'center'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowKeypadForAdjustment(prev => !prev)}
                        style={{ padding: '0 12px', fontWeight: 700 }}
                      >
                        ⌨️ Keypad
                      </button>
                    </div>

                    {/* Quick step buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[-5, -10, -20, -50].map(diff => {
                        const target = Math.max(1, basePrice + diff);
                        return (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setAdjustmentInputVal(String(target))}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            ₹{target} ({diff}₹)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Option 3: Price Increase */}
                {adjustmentMode === 'PRICE_INCREASE' && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
                        Increased Selling Price (₹ / {adjustmentModalItem.unit})
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700 }}>
                        +₹{livePricing.price_difference.toFixed(2)} (+{livePricing.price_difference_percent.toFixed(1)}%)
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="number"
                        step="any"
                        min={basePrice}
                        value={adjustmentInputVal}
                        onChange={(e) => setAdjustmentInputVal(e.target.value)}
                        placeholder={`e.g. ${basePrice + 10}`}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '2px solid #f59e0b',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          textAlign: 'center'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowKeypadForAdjustment(prev => !prev)}
                        style={{ padding: '0 12px', fontWeight: 700 }}
                      >
                        ⌨️ Keypad
                      </button>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px' }}>
                      ℹ️ Price increase is not treated as a discount. It applies a legitimate rate adjustment.
                    </div>
                  </div>
                )}

                {/* On-Screen Numeric Keypad if requested */}
                {showKeypadForAdjustment && (
                  <div style={{ marginBottom: '14px' }}>
                    <NumericKeypad
                      isOpen={showKeypadForAdjustment}
                      value={adjustmentInputVal}
                      onChange={(newVal) => setAdjustmentInputVal(newVal)}
                      onClose={() => setShowKeypadForAdjustment(false)}
                      presets={adjustmentMode === 'DISCOUNT_PERCENT' ? [
                        { label: '5%', value: 5 },
                        { label: '10%', value: 10 },
                        { label: '12.5%', value: 12.5 },
                        { label: '20%', value: 20 }
                      ] : undefined}
                    />
                  </div>
                )}

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
                  <div>Original Price: <strong>₹{basePrice.toFixed(2)}</strong></div>
                  <div>Adjusted Rate: <strong style={{ color: '#0f172a' }}>₹{livePricing.unit_price.toFixed(2)}</strong></div>
                  {livePricing.is_price_increase ? (
                    <div>Price Increase: <strong style={{ color: '#d97706' }}>+₹{livePricing.price_difference.toFixed(2)} (+{livePricing.price_difference_percent.toFixed(1)}%)</strong></div>
                  ) : (
                    <div>Discount Amount: <strong style={{ color: '#059669' }}>-₹{livePricing.discount_amount.toFixed(2)} ({livePricing.discount_percent.toFixed(1)}%)</strong></div>
                  )}
                  <div>Pre-Tax Line Total: <strong>₹{livePricing.taxable_amount.toFixed(2)}</strong></div>
                  {livePricing.gst_percent > 0 && (
                    <div>GST ({livePricing.gst_percent}%): <strong>₹{livePricing.tax_amount.toFixed(2)}</strong></div>
                  )}
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                    <span>Final Line Total:</span>
                    <span style={{ color: 'var(--primary-700)' }}>₹{livePricing.line_total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Reason Selection */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Adjustment Reason *
                  </label>
                  <select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Customer negotiation">Customer negotiation</option>
                    <option value="Damaged packaging">Damaged packaging</option>
                    <option value="Bulk purchase">Bulk purchase</option>
                    <option value="Loyal customer">Loyal customer</option>
                    <option value="Promotional discount">Promotional discount</option>
                    <option value="Clearance">Clearance</option>
                    <option value="Market rate surge">Market rate surge / Demand</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Manager Approval Box: Only displayed if store has explicit strict PIN enforcement configured */}
                {isCashierPinEnforced && managerApprovalNeeded && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 700, fontSize: '0.825rem', marginBottom: '4px' }}>
                      <ShieldAlert size={16} />
                      Manager Approval Required (Store Policy Enforced)
                    </div>
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

              <div className="modal-footer" style={{ padding: '12px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setAdjustmentModalItem(null); setShowKeypadForAdjustment(false); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyItemAdjustment}
                >
                  Apply Price Adjustment
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PHASE 6: MOBILE / TABLET CAMERA BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(code) => handleBarcodeScanned(code)}
        title="Mobile Barcode Scanner"
      />

      {/* INTELLIGENT AUTO-RECOGNITION: NEW PRODUCT DETECTED MODAL */}
      {detectedGlobalProduct && (
        <NewProductDetectedModal
          isOpen={Boolean(detectedGlobalProduct)}
          barcode={detectedGlobalProduct.barcode}
          globalProduct={detectedGlobalProduct.data}
          categories={categories}
          onClose={() => setDetectedGlobalProduct(null)}
          onProductCreated={handleAutoProductCreated}
        />
      )}

      {/* UNKNOWN BARCODE WORKFLOW MODAL: QUICK CREATE OR SEARCH & ASSIGN */}
      {unknownBarcodePrompt && (
        <UnknownBarcodeModal
          isOpen={Boolean(unknownBarcodePrompt)}
          barcode={unknownBarcodePrompt.barcode}
          categories={categories}
          onClose={() => setUnknownBarcodePrompt(null)}
          onProductCreatedOrAssigned={handleAutoProductCreated}
          onScanAgain={() => {
            setUnknownBarcodePrompt(null);
            setIsCameraScannerOpen(true);
          }}
        />
      )}

      {/* SAVED CARTS & RECENT BILLS MODAL */}
      {isSavedOrdersModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSavedOrdersModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={22} color="var(--primary-700)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Saved Carts & Recent Bills</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Revise existing bills to add missed products, or resume held customer carts
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon btn-secondary"
                onClick={() => setIsSavedOrdersModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 20px' }}>
              <button
                type="button"
                onClick={() => setSavedOrdersTab('recent')}
                style={{
                  padding: '12px 18px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: savedOrdersTab === 'recent' ? '3px solid var(--primary-600)' : '3px solid transparent',
                  color: savedOrdersTab === 'recent' ? 'var(--primary-700)' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FileText size={16} /> Recent Completed Bills ({recentBills.length})
              </button>
              <button
                type="button"
                onClick={() => setSavedOrdersTab('held')}
                style={{
                  padding: '12px 18px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: savedOrdersTab === 'held' ? '3px solid var(--primary-600)' : '3px solid transparent',
                  color: savedOrdersTab === 'held' ? 'var(--primary-700)' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Pause size={16} /> Held Draft Carts ({heldOrders.length})
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {savedOrdersTab === 'recent' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', flex: 1, minWidth: '220px' }}>
                      <Search size={16} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Search by invoice # or customer..."
                        value={recentBillsSearch}
                        onChange={(e) => setRecentBillsSearch(e.target.value)}
                        style={{ border: 'none', width: '100%', marginLeft: '8px', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={fetchRecentBills}
                      disabled={isLoadingRecentBills}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw size={13} className={isLoadingRecentBills ? 'spin' : ''} />
                      Refresh Bills
                    </button>
                  </div>

                  {isLoadingRecentBills ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
                      <p>Loading recent bills...</p>
                    </div>
                  ) : recentBills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <FileText size={40} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                      <p>No POS bills found.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {recentBills
                        .filter(o => {
                          const s = recentBillsSearch.toLowerCase();
                          return !s ||
                            String(o.invoice_number || '').toLowerCase().includes(s) ||
                            String(o.order_number || '').toLowerCase().includes(s) ||
                            String(o.customer_name || '').toLowerCase().includes(s) ||
                            String(o.customer_phone || '').toLowerCase().includes(s);
                        })
                        .map(order => (
                          <div
                            key={order.id}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              background: '#fff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ flex: '1 1 280px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 800, color: 'var(--primary-700)', fontSize: '0.95rem' }}>
                                  #{order.invoice_number}
                                </span>
                                <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  {order.payment_method || 'CASH'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                                <strong>{order.customer_name || 'Walk-in Customer'}</strong>
                                {order.customer_phone && order.customer_phone !== 'N/A' && ` • ${order.customer_phone}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                {order.items ? `${order.items.length} items (${order.items.map((i: any) => i.product_name).slice(0, 3).join(', ')}${order.items.length > 3 ? '...' : ''})` : 'Items billed'}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', minWidth: '110px' }}>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                ₹{Number(order.total_amount || 0).toFixed(2)}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                                ✓ {order.payment_status || 'PAID'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleLoadOrderForEdit(order)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0284c7', borderColor: '#0284c7' }}
                                title="Add missed products to this bill and print revised invoice"
                              >
                                <Edit3 size={14} /> Add Missed Items
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleReprintReceipt(order)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                                title="Re-print thermal bill"
                              >
                                <Printer size={14} /> Print Bill
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {savedOrdersTab === 'held' && (
                <div>
                  {heldOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <Pause size={40} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                      <p>No carts currently on hold.</p>
                      <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        Click "Hold" in the billing cart anytime a customer leaves the counter to pick up more items.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {heldOrders.map((held) => (
                        <div
                          key={held.id}
                          style={{
                            border: '1px solid #fde68a',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            background: '#fffbeb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }}>
                              Customer: {held.customer_name} {held.customer_phone ? `(${held.customer_phone})` : ''}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                              Held at: {new Date(held.saved_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {held.items_count} items
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#78350f' }}>
                              ₹{held.total_amount.toFixed(2)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleResumeHeldCart(held)}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <Play size={14} /> Resume Billing
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteHeldCart(held.id)}
                              style={{ color: '#dc2626' }}
                            >
                              <Trash2 size={14} /> Discard
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSavedOrdersModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
