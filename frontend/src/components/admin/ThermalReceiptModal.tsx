import React, { useRef, useState, useEffect } from 'react';
import { StoreProfile } from '../../types';
import { thermalPrinter, ReceiptData, PrinterStatus } from '../../services/hardware';
import { api } from '../../services/api';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Check,
  MessageSquare,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Bluetooth,
  Usb,
  Radio,
  Archive,
  Loader2
} from 'lucide-react';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
  store: StoreProfile;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptData,
  store,
}) => {
  if (!isOpen) return null;

  const [paperWidth, setPaperWidthState] = React.useState<'58mm' | '80mm'>(
    store?.printer_width || (localStorage.getItem('preferred_printer_width') as '58mm' | '80mm') || '80mm'
  );
  const setPaperWidth = (w: '58mm' | '80mm') => {
    setPaperWidthState(w);
    try { localStorage.setItem('preferred_printer_width', w); } catch {}
  };
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Hardware Connection State
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(thermalPrinter.getStatus());
  const [isConnectingBt, setIsConnectingBt] = useState(false);
  const [isConnectingUsb, setIsConnectingUsb] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to thermal printer status changes
  useEffect(() => {
    thermalPrinter.setWidth(paperWidth);
    const unsubscribe = thermalPrinter.onStatusChange((status) => {
      setPrinterStatus(status);
    });
    return unsubscribe;
  }, [paperWidth]);

  // Robust UPI ID and Store Name fallbacks
  const activeUpiId = receiptData.upi_id || store?.upi_id || 'apnakirana@okhdfcbank';
  const activeStoreName = receiptData.store_name || store?.name || 'Apna Kirana';

  // WhatsApp dispatch states
  const [waPhone, setWaPhone] = useState(receiptData.customer_phone || '');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waFeedback, setWaFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Generate UPI QR on receipt
  useEffect(() => {
    if (!activeUpiId) return;

    const totalVal = typeof receiptData.total === 'number'
      ? receiptData.total.toFixed(2)
      : Number(receiptData.total || 0).toFixed(2);
    const invoiceLabel = receiptData.invoice_no || 'Bill';
    const upiUrl = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(activeStoreName)}&am=${totalVal}&cu=INR&tn=${encodeURIComponent('Bill ' + invoiceLabel)}`;
    const qrSize = paperWidth === '58mm' ? 100 : 130;

    // Direct Canvas Rendering
    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, upiUrl, {
        width: qrSize,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }, (err) => {
        if (err) console.error('Error drawing receipt QR to canvas:', err);
      });
    }

    // High compatibility DataURL for printing & crisp image display
    QRCode.toDataURL(upiUrl, {
      width: qrSize,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(url => {
      setQrDataUrl(url);
    }).catch(err => {
      console.error('Error generating receipt QR data URL:', err);
    });
  }, [receiptData, store, paperWidth, activeUpiId, activeStoreName]);

  const handleConnectBluetooth = async () => {
    setIsConnectingBt(true);
    setPrintFeedback(null);
    try {
      const res = await thermalPrinter.connectBluetooth();
      if (res.success) {
        setPrintFeedback({ type: 'success', message: `Connected to Bluetooth Printer: ${res.deviceName}` });
      } else {
        setPrintFeedback({ type: 'error', message: res.error || 'Bluetooth pairing was cancelled.' });
      }
    } catch (err: any) {
      setPrintFeedback({ type: 'error', message: err.message || 'Bluetooth connection failed.' });
    } finally {
      setIsConnectingBt(false);
    }
  };

  const handleConnectUsb = async () => {
    setIsConnectingUsb(true);
    setPrintFeedback(null);
    try {
      // Try WebUSB first, fallback to Web Serial
      let res = await thermalPrinter.connectUsb();
      if (!res.success && printerStatus.supportsSerial) {
        res = await thermalPrinter.connectSerial(9600);
      }
      if (res.success) {
        setPrintFeedback({ type: 'success', message: `Connected to USB Printer: ${res.deviceName}` });
      } else {
        setPrintFeedback({ type: 'error', message: res.error || 'USB printer selection was cancelled.' });
      }
    } catch (err: any) {
      setPrintFeedback({ type: 'error', message: err.message || 'USB printer connection failed.' });
    } finally {
      setIsConnectingUsb(false);
    }
  };

  const handleDisconnect = async () => {
    await thermalPrinter.disconnect();
    setPrintFeedback({ type: 'success', message: 'Printer disconnected. Switched to Browser Print.' });
  };

  const handleKickDrawer = async () => {
    const res = await thermalPrinter.kickCashDrawer();
    if (res.success) {
      setPrintFeedback({ type: 'success', message: 'Cash drawer pulse sent successfully!' });
    } else {
      setPrintFeedback({ type: 'error', message: res.error || 'Could not kick cash drawer.' });
    }
  };

  const handlePrint = async () => {
    thermalPrinter.setWidth(paperWidth);
    setPrintFeedback(null);

    const res = await thermalPrinter.printEscPosReceipt(receiptData);
    if (res.modeUsed === 'BLUETOOTH' || res.modeUsed === 'USB' || res.modeUsed === 'SERIAL') {
      setPrintFeedback({
        type: 'success',
        message: `ESC/POS receipt sent directly to ${printerStatus.deviceName || res.modeUsed} printer!`
      });
    } else if (res.error) {
      setPrintFeedback({
        type: 'error',
        message: res.error
      });
    }
  };

  const handleSendWhatsAppAPI = async () => {
    const cleanPhone = waPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setWaFeedback({ type: 'error', message: 'Enter a valid 10-digit mobile number' });
      return;
    }

    setIsSendingWa(true);
    setWaFeedback(null);
    try {
      const res = await api.sendInvoiceWhatsApp(receiptData.invoice_no, cleanPhone);
      setWaFeedback({
        type: 'success',
        message: res.message || `Invoice sent to +91 ${cleanPhone} successfully!`
      });
    } catch (err: any) {
      setWaFeedback({
        type: 'error',
        message: err.message || 'WhatsApp Cloud API unavailable. Use direct link below.'
      });
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleOpenWhatsAppDirect = () => {
    const cleanPhone = waPhone.replace(/\D/g, '').slice(-10);
    const target = cleanPhone.length === 10 ? '91' + cleanPhone : '';
    const itemsSummary = (receiptData.items || [])
      .slice(0, 5)
      .map(it => `• ${it.name} (${it.qty} ${it.unit}) - ₹${it.amount.toFixed(2)}`)
      .join('\n');
    const extra = (receiptData.items?.length || 0) > 5 ? `\n...and ${(receiptData.items?.length || 0) - 5} more items` : '';

    const text = `Hello *${receiptData.customer_name || 'Valued Customer'}*,\n\nThank you for shopping at *${receiptData.store_name}*!\n\n📄 *Bill No:* ${receiptData.invoice_no}\n📅 *Date:* ${receiptData.date_time}\n💰 *Total Amount:* ₹${receiptData.total.toFixed(2)}\n💳 *Payment Mode:* ${receiptData.payment_method}\n\n*Items Purchased:*\n${itemsSummary}${extra}\n\n🙏 Thank you for your visit! Visit again.`;

    const url = target 
      ? `https://api.whatsapp.com/send?phone=${target}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="modal-card" style={{ maxWidth: '520px', width: '100%', borderRadius: '16px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={20} color="var(--primary-700)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Thermal Bill / Invoice</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 58mm vs 80mm toggle */}
            <div style={{ background: '#f1f5f9', borderRadius: '6px', padding: '2px', display: 'flex' }}>
              <button
                type="button"
                className={`btn-sm ${paperWidth === '58mm' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none' }}
                onClick={() => setPaperWidth('58mm')}
              >
                58mm (2")
              </button>
              <button
                type="button"
                className={`btn-sm ${paperWidth === '80mm' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none' }}
                onClick={() => setPaperWidth('80mm')}
              >
                80mm (3")
              </button>
            </div>

            <button className="btn-icon btn-secondary" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hardware Connection Bar (Bluetooth & USB Support) */}
        <div style={{ background: '#f8fafc', padding: '10px 18px', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: '#334155' }}>Printer:</span>
              {printerStatus.isConnected ? (
                <span className="badge badge-green" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} />
                  <span>{printerStatus.deviceName || printerStatus.mode}</span>
                </span>
              ) : (
                <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                  Browser Dialog
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!printerStatus.isConnected ? (
                <>
                  <button
                    type="button"
                    onClick={handleConnectBluetooth}
                    disabled={isConnectingBt}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                    title="Connect portable Bluetooth ESC/POS printer (POS-58 / POS-80)"
                  >
                    {isConnectingBt ? <Loader2 size={12} className="spin" /> : <Bluetooth size={12} />}
                    <span>Pair Bluetooth</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectUsb}
                    disabled={isConnectingUsb}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#15803d',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                    title="Connect USB or Serial thermal receipt printer"
                  >
                    {isConnectingUsb ? <Loader2 size={12} className="spin" /> : <Usb size={12} />}
                    <span>Connect USB</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleKickDrawer}
                    style={{
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      color: '#b45309',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Send pulse to cash drawer RJ11 port"
                  >
                    Kick Drawer
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {printFeedback && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '0.73rem',
                fontWeight: 600,
                color: printFeedback.type === 'success' ? '#15803d' : '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {printFeedback.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              <span>{printFeedback.message}</span>
            </div>
          )}
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="modal-body" style={{ background: '#e2e8f0', padding: '16px', maxHeight: '420px', overflowY: 'auto' }}>
          <div id="printable-receipt" className={`receipt-paper ${paperWidth === '58mm' ? 'w-58mm' : 'w-80mm'}`}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: paperWidth === '58mm' ? '1rem' : '1.25rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 2px' }}>
                {receiptData.store_name}
              </h2>
              {receiptData.store_tagline && (
                <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0 0 2px' }}>{receiptData.store_tagline}</p>
              )}
              <p style={{ fontSize: '0.75rem', margin: '0 0 2px' }}>{receiptData.address}</p>
              <p style={{ fontSize: '0.75rem', margin: '0 0 2px' }}>Ph: {receiptData.phone}</p>
              {receiptData.gstin && (
                <p style={{ fontSize: '0.75rem', margin: '0' }}>GSTIN: {receiptData.gstin}</p>
              )}
            </div>

            <div className="receipt-double-divider" />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>Bill No: {receiptData.invoice_no}</span>
              <span>{receiptData.date_time}</span>
            </div>

            {receiptData.customer_name && receiptData.customer_name !== 'Walk-in Customer' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '2px' }}>
                <span>Cust: {receiptData.customer_name}</span>
                <span>{receiptData.customer_phone}</span>
              </div>
            )}

            <div className="receipt-divider" />

            {/* Items Table */}
            <div style={{ width: '100%', fontSize: paperWidth === '58mm' ? '0.75rem' : '0.825rem' }}>
              {receiptData.items.map((it, idx) => (
                <div key={idx} style={{ marginBottom: '6px' }}>
                  <div style={{ fontWeight: 700 }}>{it.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
                    <span>{it.qty} {it.unit} x ₹{it.rate}</span>
                    <span style={{ fontWeight: 800 }}>₹{it.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="receipt-divider" />

            {/* Totals */}
            <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{receiptData.subtotal.toFixed(2)}</span>
              </div>

              {receiptData.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount Savings:</span>
                  <span>-₹{receiptData.discount.toFixed(2)}</span>
                </div>
              )}

              {receiptData.delivery_charge && receiptData.delivery_charge > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Delivery Charge:</span>
                  <span>₹{receiptData.delivery_charge.toFixed(2)}</span>
                </div>
              ) : null}

              {receiptData.gst_amount && receiptData.gst_amount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#555' }}>
                  <span>Included GST:</span>
                  <span>₹{receiptData.gst_amount.toFixed(2)}</span>
                </div>
              ) : null}

              <div className="receipt-double-divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900 }}>
                <span>TOTAL AMOUNT:</span>
                <span>₹{receiptData.total.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
                <span>Payment Mode:</span>
                <span style={{ fontWeight: 800 }}>{receiptData.payment_method}</span>
              </div>
            </div>

            <div className="receipt-double-divider" />

            {/* UPI QR & Footer */}
            <div className="receipt-qr-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to Pay UPI QR"
                  style={{
                    display: 'block',
                    margin: '0 auto 6px',
                    width: paperWidth === '58mm' ? '100px' : '130px',
                    height: paperWidth === '58mm' ? '100px' : '130px',
                    imageRendering: 'pixelated',
                  }}
                />
              ) : (
                <canvas ref={qrCanvasRef} style={{ display: 'block', margin: '0 auto 6px' }} />
              )}
              <span style={{ fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>Scan with GPay / PhonePe / Paytm</span>
              <span style={{ fontSize: '0.65rem', display: 'block' }}>UPI: {activeUpiId}</span>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.4 }}>
              <strong>** THANK YOU FOR SHOPPING WITH US! **</strong>
              <p style={{ margin: '2px 0 0' }}>Fresh Groceries • Best Rates • Visit Again</p>
            </div>
          </div>

          {/* WhatsApp Digital Bill Section */}
          <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '0.85rem' }}>
                <MessageSquare size={16} color="#16a34a" />
                <span>Send Digital Bill to WhatsApp</span>
              </div>
              <button
                type="button"
                onClick={handleOpenWhatsAppDirect}
                style={{ background: 'none', border: 'none', color: '#15803d', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', padding: 0 }}
                title="Open WhatsApp Web or App directly"
              >
                <span>Direct Chat</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="10-digit mobile number"
                maxLength={10}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.85rem', background: 'white' }}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSendWhatsAppAPI}
                disabled={isSendingWa}
                style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '0 14px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              >
                <Send size={13} />
                <span>{isSendingWa ? 'Sending...' : 'Send WhatsApp'}</span>
              </button>
            </div>

            {waFeedback && (
              <div style={{
                marginTop: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: waFeedback.type === 'success' ? '#15803d' : '#b91c1c'
              }}>
                {waFeedback.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{waFeedback.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary btn-lg" onClick={handlePrint} style={{ gap: '8px', padding: '10px 22px', fontWeight: 800 }}>
            {printerStatus.mode === 'BLUETOOTH' ? <Bluetooth size={18} /> : (printerStatus.mode === 'USB' || printerStatus.mode === 'SERIAL') ? <Usb size={18} /> : <Printer size={18} />}
            <span>
              {printerStatus.isConnected
                ? `PRINT VIA ${printerStatus.mode} ESC/POS`
                : 'PRINT THERMAL RECEIPT'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
