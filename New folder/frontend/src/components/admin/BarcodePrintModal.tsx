import React, { useRef, useEffect } from 'react';
import { Product } from '../../types';
import { X, Printer, Barcode as BarcodeIcon } from 'lucide-react';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!isOpen) return null;

  const [labelCount, setLabelCount] = React.useState<number>(4);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render Barcode Pattern on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';

    // Generate deterministic barcode stripes based on digits
    const code = product.barcode;
    const barWidth = 2.5;
    let x = 15;

    // Guard bar
    ctx.fillRect(x, 5, 2, 45); x += 4;
    ctx.fillRect(x, 5, 2, 45); x += 4;

    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]) || 3;
      const w1 = ((digit % 3) + 1) * barWidth;
      const gap = (((digit + 1) % 2) + 1) * barWidth;

      ctx.fillRect(x, 5, w1, 40);
      x += w1 + gap;
    }

    // End guard bar
    ctx.fillRect(x, 5, 2, 45); x += 4;
    ctx.fillRect(x, 5, 2, 45);
  }, [product]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarcodeIcon size={20} color="var(--primary-700)" />
            <h3>Print Shelf Barcode Labels</h3>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, marginRight: '8px' }}>
              Number of Labels:
            </label>
            <select
              value={labelCount}
              onChange={(e) => setLabelCount(parseInt(e.target.value) || 1)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-light)' }}
            >
              <option value="1">1 Label</option>
              <option value="4">4 Labels</option>
              <option value="8">8 Labels</option>
              <option value="16">16 Labels (Full Sheet)</option>
            </select>
          </div>

          {/* Barcode Sticker Preview */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', maxHeight: '280px', overflowY: 'auto', padding: '10px', background: '#f1f5f9', borderRadius: 'var(--radius-lg)' }}>
            {Array.from({ length: labelCount }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '180px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '10px 8px',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary-800)', margin: '2px 0' }}>
                  ₹{product.selling_price}
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}> / {product.unit}</span>
                </div>

                <canvas ref={idx === 0 ? canvasRef : undefined} width={150} height={50} style={{ display: 'block', margin: '4px auto' }} />

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                  {product.barcode}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint} style={{ gap: '6px' }}>
            <Printer size={16} />
            <span>PRINT LABELS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
