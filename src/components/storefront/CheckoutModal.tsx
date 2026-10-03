import React, { useState, useEffect, useRef } from 'react';
import { CartItem, StoreProfile, DeliveryArea, CustomerUser } from '../../types';
import { api } from '../../services/api';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { 
  X, CheckCircle2, QrCode, Banknote, CreditCard, Truck, 
  Store as StoreIcon, ShieldCheck, MapPin, AlertCircle, Navigation, Clock, Phone
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  store: StoreProfile;
  customer?: CustomerUser | null;
  onOrderSuccess: (orderInfo: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  store,
  customer,
  onOrderSuccess,
}) => {
  if (!isOpen) return null;

  const [deliveryMode, setDeliveryMode] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [customerName, setCustomerName] = useState(customer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  
  // Detailed Address Fields
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState(customer?.address || '');
  const [areaName, setAreaName] = useState('');
  const [city, setCity] = useState(store.city || 'Hyderabad');
  const [stateName, setStateName] = useState('Telangana');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (customer) {
      if (customer.name && !customerName) setCustomerName(customer.name);
      if (customer.phone && !customerPhone) setCustomerPhone(customer.phone);
      if (customer.address && !street) setStreet(customer.address);
    }
  }, [customer]);

  // PIN validation state
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [validatedArea, setValidatedArea] = useState<DeliveryArea | null>(null);
  const [pinError, setPinError] = useState('');

  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'UPI' | 'COD'>('RAZORPAY');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderResult, setOrderResult] = useState<any | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const subtotal = items.reduce((sum, it) => sum + it.total_price, 0);
  
  // Dynamic Delivery Charge
  const baseDeliveryCharge = validatedArea ? validatedArea.delivery_charge : store.delivery_charge;
  const isFreeDelivery = deliveryMode === 'PICKUP' || subtotal >= (validatedArea?.free_delivery_above || store.free_delivery_above);
  const deliveryCharge = isFreeDelivery ? 0 : baseDeliveryCharge;
  const grandTotal = subtotal + deliveryCharge;

  // Load Razorpay SDK
  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Validate PIN code live when entered
  useEffect(() => {
    const cleanPin = pincode.trim();
    if (cleanPin.length === 6) {
      setIsValidatingPin(true);
      setPinError('');
      api.validatePincode(cleanPin)
        .then((res) => {
          if (res.serviceable && res.area) {
            setValidatedArea(res.area);
            if (!areaName) {
              setAreaName(res.area.area_name);
            }
            setPinError('');
          } else {
            setValidatedArea(null);
            setPinError(res.message || 'Sorry, home delivery is currently unavailable in your area.');
          }
        })
        .catch(() => {
          setValidatedArea(null);
          setPinError('Failed to verify delivery coverage. Please check connection.');
        })
        .finally(() => setIsValidatingPin(false));
    } else if (cleanPin.length > 0 && cleanPin.length < 6) {
      setValidatedArea(null);
      setPinError('');
    } else {
      setValidatedArea(null);
      setPinError('');
    }
  }, [pincode]);

  // GPS Location detector
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        alert('Could not retrieve GPS location. You can still enter your address manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Generate Dynamic UPI QR Code
  useEffect(() => {
    if (paymentMethod === 'UPI' && qrCanvasRef.current && !orderResult) {
      const activeUpiId = store?.upi_id || 'apnakirana@okhdfcbank';
      const activeStoreName = store?.name || 'Apna Kirana';
      const upiUrl = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(activeStoreName)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Grocery Order')}`;
      QRCode.toCanvas(qrCanvasRef.current, upiUrl, {
        width: 170,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      }, (err) => {
        if (err) console.error('Error generating UPI QR:', err);
      });
    }
  }, [paymentMethod, grandTotal, store, orderResult]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Please provide your name and mobile number');
      return;
    }

    if (deliveryMode === 'DELIVERY') {
      if (!pincode.trim() || pincode.trim().length !== 6) {
        setErrorMessage('Please enter a valid 6-digit PIN code');
        return;
      }
      if (pinError || !validatedArea) {
        setErrorMessage('Home delivery is not available for this PIN code. Please select Store Self Pickup.');
        return;
      }
      if (!houseNumber.trim() || !street.trim()) {
        setErrorMessage('Please enter House/Flat No. and Street address');
        return;
      }
      if (validatedArea.min_order_amount && subtotal < validatedArea.min_order_amount) {
        setErrorMessage(`Minimum order for ${validatedArea.area_name} is ₹${validatedArea.min_order_amount}`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const fullAddress = deliveryMode === 'PICKUP' 
        ? 'Store Counter Pickup' 
        : `${houseNumber.trim()}, ${street.trim()}, ${areaName || validatedArea?.area_name || ''}, ${city}, ${stateName} - ${pincode}${landmark ? ` (Landmark: ${landmark.trim()})` : ''}`;

      const payload = {
        items: items.map(it => ({
          product_id: it.product.id,
          quantity: it.quantity,
        })),
        customer_id: customer?.id || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: fullAddress,
        delivery_mode: deliveryMode,
        payment_method: paymentMethod,
        notes: notes.trim(),
        pincode: deliveryMode === 'DELIVERY' ? pincode.trim() : null,
        area: deliveryMode === 'DELIVERY' ? (areaName || validatedArea?.area_name || null) : null,
        landmark: deliveryMode === 'DELIVERY' ? landmark.trim() : null,
        latitude: deliveryMode === 'DELIVERY' ? latitude : null,
        longitude: deliveryMode === 'DELIVERY' ? longitude : null,
      };

      const result: any = await api.createOnlineOrder(payload as any);

      // PHASE 3: RAZORPAY INTEGRATION & SERVER-SIDE VERIFICATION
      if (paymentMethod === 'RAZORPAY' && result.payment_data?.razorpay_order_id) {
        const isSdkReady = await loadRazorpaySDK();
        const hasLiveSDK = isSdkReady && (window as any).Razorpay && !result.payment_data.is_mock;

        if (hasLiveSDK) {
          const rzp = new (window as any).Razorpay({
            key: result.payment_data.key_id,
            amount: result.payment_data.amount,
            currency: result.payment_data.currency || 'INR',
            name: store.name,
            description: `Order #${result.order_number}`,
            order_id: result.payment_data.razorpay_order_id,
            prefill: {
              name: customerName,
              contact: customerPhone
            },
            theme: { color: '#059669' },
            handler: async (resp: any) => {
              try {
                // Server-side cryptographic signature verification
                const verifyRes = await api.verifyRazorpayPayment({
                  order_id: result.order_id,
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature
                });
                setOrderResult({
                  ...result,
                  payment_status: 'PAID',
                  provider_payment_id: resp.razorpay_payment_id
                });
                onOrderSuccess({ ...result, payment_status: 'PAID' });
                confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
              } catch (vErr: any) {
                setErrorMessage('Payment verification failed: ' + vErr.message);
              }
            },
            modal: {
              ondismiss: () => {
                // Order created in PENDING payment state
                setOrderResult({ ...result, payment_status: 'PENDING' });
                onOrderSuccess({ ...result, payment_status: 'PENDING' });
              }
            }
          });
          rzp.open();
          return;
        } else {
          // Test mode / demo simulated Razorpay verification
          try {
            const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 10)}`;
            await api.verifyRazorpayPayment({
              order_id: result.order_id,
              razorpay_order_id: result.payment_data.razorpay_order_id,
              razorpay_payment_id: mockPaymentId,
              razorpay_signature: 'demo_test_signature'
            });
            setOrderResult({
              ...result,
              payment_status: 'PAID',
              provider_payment_id: mockPaymentId
            });
            onOrderSuccess({ ...result, payment_status: 'PAID' });
            confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
            return;
          } catch (simErr: any) {
            console.warn('[Razorpay simulated notice]:', simErr.message);
          }
        }
      }

      setOrderResult(result);
      onOrderSuccess(result);

      // Confetti celebratory burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating order. Please check stock availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '680px', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
              {orderResult ? '🎉 Order Placed Successfully!' : '⚡ Fast Grocery Checkout'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {store.name} • Local Kirana Superstore
            </span>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {orderResult ? (
            /* SUCCESS CONFIRMATION SCREEN */
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-100)',
                color: 'var(--primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <CheckCircle2 size={40} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Thank you, {customerName}!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Your order has been recorded and the store is preparing it.
              </p>

              {/* Special Pickup Code Display for In-Store Pickup */}
              {orderResult.delivery_mode === 'PICKUP' && orderResult.pickup_code && (
                <div style={{
                  background: '#fef3c7',
                  border: '2px dashed #f59e0b',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  maxWidth: '440px',
                  margin: '0 auto 20px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    YOUR STORE PICKUP VERIFICATION CODE
                  </span>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#b45309', letterSpacing: '4px', margin: '6px 0' }}>
                    {orderResult.pickup_code}
                  </div>
                  <p style={{ fontSize: '0.825rem', color: '#78350f', margin: 0 }}>
                    Please show this 4-digit code at the store billing counter to pick up your grocery bag.
                  </p>
                </div>
              )}

              <div style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                maxWidth: '440px',
                margin: '0 auto 20px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Order Number:</span>
                  <strong style={{ color: 'var(--primary-700)' }}>{orderResult.order_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Fulfillment:</span>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {orderResult.delivery_mode === 'PICKUP' ? 'Store Self Pickup' : 'Home Delivery'}
                  </strong>
                </div>
                {orderResult.area && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Delivery Area:</span>
                    <span>{orderResult.area} ({orderResult.pincode})</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Amount:</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>₹{orderResult.total_amount.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Payment Status:</span>
                  <span className={`badge ${orderResult.payment_status === 'PAID' ? 'badge-green' : 'badge-yellow'}`}>
                    {orderResult.payment_status} ({orderResult.payment_method})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Est. Time:</span>
                  <strong style={{ color: 'var(--primary-600)' }}>{orderResult.estimated_delivery_mins || '30-45 mins'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-primary btn-lg" onClick={onClose}>
                  Done & Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT FORM */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMessage && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Delivery Mode Toggle */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  CHOOSE FULFILLMENT MODE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    className={`btn ${deliveryMode === 'DELIVERY' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '14px', borderRadius: 'var(--radius-md)', justifyContent: 'center' }}
                    onClick={() => setDeliveryMode('DELIVERY')}
                  >
                    <Truck size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Home Delivery</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Direct to your doorstep</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`btn ${deliveryMode === 'PICKUP' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '14px', borderRadius: 'var(--radius-md)', justifyContent: 'center' }}
                    onClick={() => setDeliveryMode('PICKUP')}
                  >
                    <StoreIcon size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Store Self Pickup</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Collect at store counter</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9820123456"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* STORE PICKUP DETAILS */}
              {deliveryMode === 'PICKUP' && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '0.95rem' }}>
                    <StoreIcon size={18} />
                    <span>Store Pickup Information</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
                    <strong>Store Address:</strong> {store.address}, {store.city}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#15803d', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span><strong>Phone:</strong> {store.phone}</span>
                    <span><strong>Estimated Ready:</strong> ~15-20 mins</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontStyle: 'italic', marginTop: '4px' }}>
                    ℹ️ You will receive a 4-digit pickup code upon checkout. Present this code at the store billing counter to collect your items.
                  </div>
                </div>
              )}

              {/* HOME DELIVERY ADDRESS & PIN VALIDATION */}
              {deliveryMode === 'DELIVERY' && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} color="var(--primary-600)" />
                      DELIVERY ADDRESS & COVERAGE CHECK
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto', gap: '4px' }}
                      onClick={handleDetectGPS}
                      disabled={isLocating}
                    >
                      <Navigation size={12} />
                      {isLocating ? 'Detecting GPS...' : latitude ? 'GPS Located ✓' : 'Detect Location'}
                    </button>
                  </div>

                  {/* PIN Code Verification Row */}
                  <div className="form-grid">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Postal PIN Code (6 digits) *</label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="e.g. 500090"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Area / Locality *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kukatpally"
                        value={areaName}
                        onChange={(e) => setAreaName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* PIN Validation Feedback Banners */}
                  {isValidatingPin && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Checking delivery availability in {pincode}...
                    </div>
                  )}

                  {pinError && (
                    <div style={{
                      padding: '10px 14px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 'var(--radius-md)',
                      color: '#b91c1c',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={16} />
                        <span>Home Delivery: NOT AVAILABLE</span>
                      </div>
                      <div>{pinError}</div>
                      <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '2px' }}>
                        💡 Tip: You can switch to <strong>Store Self Pickup</strong> to collect your order directly.
                      </div>
                    </div>
                  )}

                  {validatedArea && !pinError && (
                    <div style={{
                      padding: '10px 14px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 'var(--radius-md)',
                      color: '#065f46',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <CheckCircle2 size={16} color="#059669" />
                        <span>✓ Delivery available in your area ({validatedArea.area_name})</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                        <span><strong>Delivery Charge:</strong> ₹{validatedArea.delivery_charge}</span>
                        <span><strong>Est. Time:</strong> {validatedArea.estimated_delivery_time}</span>
                        {validatedArea.min_order_amount > 0 && (
                          <span><strong>Min Order:</strong> ₹{validatedArea.min_order_amount}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Street & House Details */}
                  <div className="form-grid">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>House / Flat No / Building *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Flat 302, Sai Residency"
                        value={houseNumber}
                        onChange={(e) => setHouseNumber(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Street / Road / Colony *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Road No 3, KPHB Phase 1"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Landmark (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Near Mother Dairy / Opp Temple"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>City & State</label>
                      <input
                        type="text"
                        readOnly
                        value={`${city}, ${stateName}`}
                        style={{ backgroundColor: 'var(--bg-subtle)', cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>

                  {latitude && longitude && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      📍 Attached GPS coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </div>
                  )}
                </div>
              )}

              {/* Special Delivery Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Special Instructions / Gate Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Please ring bell twice or leave at security desk"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  SELECT PAYMENT METHOD
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'RAZORPAY' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '12px 8px', fontSize: '0.825rem', flexDirection: 'column', gap: '4px' }}
                    onClick={() => setPaymentMethod('RAZORPAY')}
                  >
                    <CreditCard size={18} />
                    <span>Online / Razorpay</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'UPI' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '12px 8px', fontSize: '0.825rem', flexDirection: 'column', gap: '4px' }}
                    onClick={() => setPaymentMethod('UPI')}
                  >
                    <QrCode size={18} />
                    <span>Store UPI QR</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'COD' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '12px 8px', fontSize: '0.825rem', flexDirection: 'column', gap: '4px' }}
                    onClick={() => setPaymentMethod('COD')}
                  >
                    <Banknote size={18} />
                    <span>Cash on Delivery</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Live UPI QR Code Generator */}
              {paymentMethod === 'UPI' && (
                <div style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px'
                }}>
                  <canvas ref={qrCanvasRef} style={{ borderRadius: '8px', background: 'white', padding: '6px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Scan & Pay ₹{grandTotal.toFixed(2)}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Works with GPay, PhonePe, Paytm, BHIM, and all UPI banking apps.
                    </p>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                      UPI ID: {store?.upi_id || 'apnakirana@okhdfcbank'}
                    </span>
                  </div>
                </div>
              )}

              {/* Order Bill Summary */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                  <span>Items Subtotal ({items.length} items):</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                  <span>Delivery Charge:</span>
                  <span>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}</span>
                </div>
                {deliveryMode === 'DELIVERY' && subtotal < store.free_delivery_above && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', marginBottom: '6px' }}>
                    💡 Add ₹{(store.free_delivery_above - subtotal).toFixed(2)} more for FREE delivery!
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--primary-700)',
                  borderTop: '1px dashed var(--border-light)',
                  paddingTop: '6px'
                }}>
                  <span>Total Amount:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', gap: '10px' }}
                disabled={isSubmitting || (deliveryMode === 'DELIVERY' && Boolean(pinError || !validatedArea))}
              >
                <ShieldCheck size={20} />
                <span>
                  {isSubmitting 
                    ? 'PLACING YOUR ORDER...' 
                    : (deliveryMode === 'DELIVERY' && pinError)
                      ? 'HOME DELIVERY UNAVAILABLE'
                      : `CONFIRM ORDER • ₹${grandTotal.toFixed(2)}`
                  }
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
