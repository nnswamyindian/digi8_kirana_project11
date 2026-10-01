import React, { useRef } from 'react';
import { StoreProfile } from '../../types';
import { thermalPrinter, ReceiptData } from '../../services/hardware';
import QRCode from 'qrcode';
import { X, Printer, Check } from 'lucide-react';

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

  const [paperWidth, setPaperWidth] = React.useState<'58mm' | '80mm'>(store.printer_width || '80mm');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate UPI QR on receipt
  React.useEffect(() => {
    if (qrCanvasRef.current && store.upi_id) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(store.upi_id)}&pn=${encodeURIComponent(store.name)}&am=${receiptData.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + receiptData.invoice_no)}`;
      QRCode.toCanvas(qrCanvasRef.current, upiUrl, {
        width: paperWidth === '58mm' ? 100 : 130,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }, (err) => {
        if (err) console.error('Error drawing receipt QR:', err);
      });
    }
  }, [receiptData, store, paperWidth]);

  const handlePrint = () => {
    thermalPrinter.setWidth(paperWidth);
    thermalPrinter.printReceipt('printable-receipt');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={20} color="var(--primary-700)" />
            <h3 style={{ fontSize: '1.1rem' }}>Thermal Bill / Invoice</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 58mm vs 80mm toggle */}
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px', display: 'flex' }}>
              <button
                className={`btn-sm ${paperWidth === '58mm' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => setPaperWidth('58mm')}
              >
                58mm (2")
              </button>
              <button
                className={`btn-sm ${paperWidth === '80mm' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
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

        {/* Scrollable Receipt Preview */}
        <div className="modal-body" style={{ background: '#e2e8f0', padding: '16px' }}>
          <div id="printable-receipt" className={`receipt-paper ${paperWidth === '58mm' ? 'w-58mm' : 'w-80mm'}`}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: paperWidth === '58mm' ? '1rem' : '1.25rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {receiptData.store_name}
              </h2>
              {receiptData.store_tagline && (
                <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>{receiptData.store_tagline}</p>
              )}
              <p style={{ fontSize: '0.75rem' }}>{receiptData.address}</p>
              <p style={{ fontSize: '0.75rem' }}>Ph: {receiptData.phone}</p>
              {receiptData.gstin && (
                <p style={{ fontSize: '0.75rem' }}>GSTIN: {receiptData.gstin}</p>
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
              <canvas ref={qrCanvasRef} style={{ display: 'block', margin: '0 auto 6px' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Scan with GPay / PhonePe / Paytm</span>
              <span style={{ fontSize: '0.65rem' }}>UPI: {store.upi_id}</span>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.4 }}>
              <strong>** THANK YOU FOR SHOPPING WITH US! **</strong>
              <p>Fresh Groceries • Best Rates • Visit Again</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary btn-lg" onClick={handlePrint} style={{ gap: '8px' }}>
            <Printer size={18} />
            <span>PRINT THERMAL RECEIPT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
