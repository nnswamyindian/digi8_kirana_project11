import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { Scale, CheckCircle2, AlertCircle, Calculator, Tag, Sparkles } from 'lucide-react';
import {
  canonicalUnit,
  convertQuantity,
  isWeightUnit,
  isVolumeUnit,
  round2,
  round3,
  calculateLooseItem,
  SupportedUnit
} from '../../services/pricingService';
import { weighingScale } from '../../services/hardware';
import { NumericKeypad } from '../common/NumericKeypad';

export interface LooseItemConfirmPayload {
  product: Product;
  quantity: number;
  unit: string;
  base_quantity: number;
  base_unit: string;
  unit_price: number;
  original_price: number;
  total_price: number;
  is_manual_price_adjusted: boolean;
  loose_details: {
    entered_weight: number;
    entered_unit: string;
    mode: 'RATE_BASED' | 'AMOUNT_BASED' | 'MANUAL_TOTAL';
    agreed_total?: number;
    rate_per_base_unit: number;
  };
}

interface LooseItemWeightModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (payload: LooseItemConfirmPayload) => void;
}

export const LooseItemWeightModal: React.FC<LooseItemWeightModalProps> = ({
  isOpen,
  product,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !product) return null;

  const baseUnit = canonicalUnit(product.unit || 'KG');
  const isWeight = isWeightUnit(baseUnit);
  const isVolume = isVolumeUnit(baseUnit);

  // Available display units for this product's measurement dimension
  const selectableUnits: SupportedUnit[] = isWeight
    ? ['KG', 'GRAM']
    : isVolume
    ? ['LITRE', 'ML']
    : [baseUnit];

  // Entry Mode: 'RATE_BASED' (enter weight -> price) | 'AMOUNT_BASED' (enter ₹ -> weight) | 'MANUAL_TOTAL' (enter weight & agreed ₹)
  const [entryMode, setEntryMode] = useState<'RATE_BASED' | 'AMOUNT_BASED' | 'MANUAL_TOTAL'>('RATE_BASED');

  // Input states
  const [selectedUnit, setSelectedUnit] = useState<SupportedUnit>(baseUnit);
  const [enteredQty, setEnteredQty] = useState<string>('1');
  const [desiredAmount, setDesiredAmount] = useState<string>('');
  const [manualTotalPrice, setManualTotalPrice] = useState<string>('');

  // Hardware weighing scale live hook
  const [scaleConnected, setScaleConnected] = useState<boolean>(false);
  const [scaleStable, setScaleStable] = useState<boolean>(true);

  // On-screen numeric keypad state
  const [activeKeypadField, setActiveKeypadField] = useState<'qty' | 'amount' | 'manualTotal' | null>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const manualTotalInputRef = useRef<HTMLInputElement>(null);

  // Reset inputs when modal opens or product changes
  useEffect(() => {
    setSelectedUnit(baseUnit);
    setEnteredQty(baseUnit === 'GRAM' ? '1000' : '1');
    setDesiredAmount('');
    setManualTotalPrice('');
    setEntryMode('RATE_BASED');
    setActiveKeypadField(null);

    // Auto-listen to weighing scale if hardware is active
    if (product.is_loose || baseUnit === 'KG') {
      weighingScale.connectSimulated((weightKg, stable) => {
        setScaleConnected(true);
        setScaleStable(stable);
        if (entryMode === 'RATE_BASED') {
          if (selectedUnit === 'GRAM') {
            setEnteredQty(String(Math.round(weightKg * 1000)));
          } else {
            setEnteredQty(String(weightKg.toFixed(3)));
          }
        }
      });
    }

    return () => {
      weighingScale.disconnect();
      setScaleConnected(false);
    };
  }, [product, baseUnit]);

  const baseRate = Number(product.selling_price) || 0;
  const availableStock = Number(product.stock) || 0;

  // Calculation computation
  const qtyNumber = parseFloat(enteredQty) || 0;
  const amountNumber = parseFloat(desiredAmount) || 0;
  const manualTotalNumber = parseFloat(manualTotalPrice) || 0;

  let calculatedResult: {
    baseQuantity: number;
    displayQuantity: number;
    displayUnit: string;
    calculatedPrice: number;
    effectiveUnitPrice: number;
  };

  if (entryMode === 'AMOUNT_BASED') {
    calculatedResult = calculateLooseItem({
      ratePerBaseUnit: baseRate,
      baseUnit,
      mode: 'AMOUNT_BASED',
      desiredAmount: amountNumber
    });
  } else if (entryMode === 'MANUAL_TOTAL') {
    calculatedResult = calculateLooseItem({
      ratePerBaseUnit: baseRate,
      baseUnit,
      mode: 'MANUAL_TOTAL',
      enteredQuantity: qtyNumber,
      enteredUnit: selectedUnit,
      manualTotal: manualTotalNumber
    });
  } else {
    calculatedResult = calculateLooseItem({
      ratePerBaseUnit: baseRate,
      baseUnit,
      mode: 'RATE_BASED',
      enteredQuantity: qtyNumber,
      enteredUnit: selectedUnit
    });
  }

  // Stock availability check
  const isOutOfStock = calculatedResult.baseQuantity > availableStock;

  const handleApplyPresetWeight = (presetQty: number, presetUnit: SupportedUnit) => {
    setEntryMode('RATE_BASED');
    setSelectedUnit(presetUnit);
    setEnteredQty(String(presetQty));
    setActiveKeypadField(null);
  };

  const handleAddLooseToBill = () => {
    if (calculatedResult.baseQuantity <= 0) {
      alert('Please enter a valid weight or quantity greater than 0.');
      return;
    }

    if (calculatedResult.calculatedPrice < 0 || isNaN(calculatedResult.calculatedPrice)) {
      alert('Please enter a valid price amount.');
      return;
    }

    // Determine final charged unit price per selected unit
    const finalUnitPrice = calculatedResult.displayQuantity > 0
      ? round2(calculatedResult.calculatedPrice / calculatedResult.displayQuantity)
      : calculatedResult.effectiveUnitPrice;

    const isPriceOverridden = entryMode === 'MANUAL_TOTAL' || Math.abs(calculatedResult.calculatedPrice - (calculatedResult.baseQuantity * baseRate)) > 0.05;

    onConfirm({
      product,
      quantity: calculatedResult.displayQuantity,
      unit: calculatedResult.displayUnit,
      base_quantity: calculatedResult.baseQuantity,
      base_unit: baseUnit,
      unit_price: finalUnitPrice,
      original_price: selectedUnit === baseUnit ? baseRate : round2(convertQuantity(1, selectedUnit, baseUnit) * baseRate),
      total_price: calculatedResult.calculatedPrice,
      is_manual_price_adjusted: isPriceOverridden,
      loose_details: {
        entered_weight: calculatedResult.displayQuantity,
        entered_unit: calculatedResult.displayUnit,
        mode: entryMode,
        agreed_total: entryMode === 'MANUAL_TOTAL' ? calculatedResult.calculatedPrice : undefined,
        rate_per_base_unit: baseRate
      }
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 2000 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '520px', width: '95vw', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '14px 20px', background: '#0f172a', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="#4ade80" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'white', fontWeight: 800 }}>
                Loose Goods Weight &amp; Pricing
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Mana Kirana Kottu — Authoritative Weighing Adapter
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{ color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '16px 20px', background: '#ffffff', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Product Info Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px'
          }}>
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                {product.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                Standard Rate: <strong style={{ color: '#059669' }}>₹{baseRate} / {baseUnit}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: availableStock <= 5 ? '#fef2f2' : '#ecfdf5',
                color: availableStock <= 5 ? '#dc2626' : '#059669',
                display: 'inline-block'
              }}>
                Stock: {availableStock} {baseUnit}
              </span>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setEntryMode('RATE_BASED');
                setActiveKeypadField(null);
              }}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: entryMode === 'RATE_BASED' ? '2px solid #059669' : '1px solid #cbd5e1',
                background: entryMode === 'RATE_BASED' ? '#ecfdf5' : '#f8fafc',
                color: entryMode === 'RATE_BASED' ? '#047857' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>⚖️ Weight Mode</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Enter weight/qty</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEntryMode('AMOUNT_BASED');
                setActiveKeypadField(null);
              }}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: entryMode === 'AMOUNT_BASED' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                background: entryMode === 'AMOUNT_BASED' ? '#e0f2fe' : '#f8fafc',
                color: entryMode === 'AMOUNT_BASED' ? '#0369a1' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>₹ Amount Mode</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>e.g. ₹20 worth</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEntryMode('MANUAL_TOTAL');
                setActiveKeypadField(null);
              }}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: entryMode === 'MANUAL_TOTAL' ? '2px solid #d97706' : '1px solid #cbd5e1',
                background: entryMode === 'MANUAL_TOTAL' ? '#fef3c7' : '#f8fafc',
                color: entryMode === 'MANUAL_TOTAL' ? '#b45309' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>🤝 Agreed Price</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Manual weight &amp; ₹</span>
            </button>
          </div>

          {/* Quick Presets for weight and volume */}
          {entryMode !== 'AMOUNT_BASED' && isWeight && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                QUICK WEIGHT PRESETS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                {[
                  { label: '100g', qty: 100, unit: 'GRAM' as SupportedUnit },
                  { label: '250g', qty: 250, unit: 'GRAM' as SupportedUnit },
                  { label: '500g', qty: 500, unit: 'GRAM' as SupportedUnit },
                  { label: '750g', qty: 750, unit: 'GRAM' as SupportedUnit },
                  { label: '1.0 kg', qty: 1, unit: 'KG' as SupportedUnit },
                  { label: '2.0 kg', qty: 2, unit: 'KG' as SupportedUnit }
                ].map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPresetWeight(p.qty, p.unit)}
                    style={{
                      padding: '6px 2px',
                      borderRadius: '6px',
                      background: selectedUnit === p.unit && enteredQty === String(p.qty) ? '#dcfce7' : '#f1f5f9',
                      border: selectedUnit === p.unit && enteredQty === String(p.qty) ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 1 & Mode 3: Weight / Quantity Input Field with Unit Selector */}
          {entryMode !== 'AMOUNT_BASED' && (
            <div style={{ marginBottom: '14px', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Weight / Quantity Measured:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  ref={qtyInputRef}
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="e.g. 750 or 0.75"
                  value={enteredQty}
                  onChange={(e) => setEnteredQty(e.target.value)}
                  onFocus={() => setActiveKeypadField('qty')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />

                {/* Unit Switcher */}
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value as SupportedUnit)}
                  style={{
                    width: '95px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  {selectableUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Connected Digital Scale LED preview */}
              {scaleConnected && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: scaleStable ? '#15803d' : '#d97706',
                  marginTop: '4px'
                }}>
                  <span>● Live Scale: {scaleStable ? 'STABLE WEIGHT CAPTURED' : 'SETTLING...'}</span>
                </div>
              )}

              {/* On-Screen Numeric Keypad for Quantity */}
              {activeKeypadField === 'qty' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 100 }}>
                  <NumericKeypad
                    isOpen={true}
                    value={enteredQty}
                    onChange={setEnteredQty}
                    onClose={() => setActiveKeypadField(null)}
                    anchorRef={qtyInputRef}
                    title="Weight / Quantity Input"
                    allowDecimal={true}
                    presets={isWeight ? [
                      { label: '250g', value: '250' },
                      { label: '500g', value: '500' },
                      { label: '750g', value: '750' },
                      { label: '1kg', value: '1' }
                    ] : []}
                  />
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Enter Amount Directly (Example 2: Sugar ₹50/kg, wanted ₹20 worth) */}
          {entryMode === 'AMOUNT_BASED' && (
            <div style={{ marginBottom: '14px', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Customer Desired Total Amount (₹):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '8px', border: '1.5px solid #0284c7', overflow: 'hidden' }}>
                <span style={{ padding: '8px 12px', background: '#e0f2fe', fontWeight: 900, color: '#0369a1', fontSize: '1.1rem' }}>
                  ₹
                </span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="any"
                  placeholder="e.g. 20, 50, 100"
                  value={desiredAmount}
                  onChange={(e) => setDesiredAmount(e.target.value)}
                  onFocus={() => setActiveKeypadField('amount')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: 'none',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              {/* Quick Amount Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '8px' }}>
                {[10, 20, 50, 100, 200].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setDesiredAmount(String(amt));
                      setActiveKeypadField(null);
                    }}
                    style={{
                      padding: '5px',
                      borderRadius: '6px',
                      background: desiredAmount === String(amt) ? '#bae6fd' : '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#0369a1',
                      cursor: 'pointer'
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* On-Screen Numeric Keypad for Desired Amount */}
              {activeKeypadField === 'amount' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 100 }}>
                  <NumericKeypad
                    isOpen={true}
                    value={desiredAmount}
                    onChange={setDesiredAmount}
                    onClose={() => setActiveKeypadField(null)}
                    anchorRef={amountInputRef}
                    title="Desired Bill Amount (₹)"
                    allowDecimal={true}
                    presets={[
                      { label: '₹10', value: '10' },
                      { label: '₹20', value: '20' },
                      { label: '₹50', value: '50' },
                      { label: '₹100', value: '100' }
                    ]}
                  />
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Manual Total Agreed Price (Example 3: Toor Dal 650g, ₹42 agreed) */}
          {entryMode === 'MANUAL_TOTAL' && (
            <div style={{ marginBottom: '14px', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                Manually Agreed Final Line Amount (₹):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '8px', border: '1.5px solid #f59e0b', overflow: 'hidden' }}>
                <span style={{ padding: '8px 12px', background: '#fef3c7', fontWeight: 900, color: '#b45309', fontSize: '1.1rem' }}>
                  ₹
                </span>
                <input
                  ref={manualTotalInputRef}
                  type="number"
                  step="any"
                  placeholder="e.g. 42"
                  value={manualTotalPrice}
                  onChange={(e) => setManualTotalPrice(e.target.value)}
                  onFocus={() => setActiveKeypadField('manualTotal')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: 'none',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                />
              </div>

              {/* On-Screen Numeric Keypad for Manual Total */}
              {activeKeypadField === 'manualTotal' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 100 }}>
                  <NumericKeypad
                    isOpen={true}
                    value={manualTotalPrice}
                    onChange={setManualTotalPrice}
                    onClose={() => setActiveKeypadField(null)}
                    anchorRef={manualTotalInputRef}
                    title="Agreed Price Total (₹)"
                    allowDecimal={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Live Calculated Summary Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Line Total Amount:
              </span>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4ade80' }}>
                ₹{calculatedResult.calculatedPrice.toFixed(2)}
              </span>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Equivalent Quantity: </span>
                <strong style={{ color: '#fef08a' }}>
                  {calculatedResult.displayQuantity} {calculatedResult.displayUnit}
                  {calculatedResult.displayUnit !== baseUnit && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '4px' }}>
                      ({calculatedResult.baseQuantity} {baseUnit})
                    </span>
                  )}
                </strong>
              </div>

              <div>
                <span style={{ color: '#94a3b8' }}>Effective Rate: </span>
                <strong style={{ color: 'white' }}>
                  ₹{calculatedResult.effectiveUnitPrice.toFixed(2)} / {baseUnit}
                </strong>
              </div>
            </div>
          </div>

          {/* Stock Warning if requested exceeds available */}
          {isOutOfStock && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '12px'
            }}>
              <AlertCircle size={15} color="#d97706" />
              <span>
                Notice: Entered quantity ({calculatedResult.baseQuantity} {baseUnit}) exceeds recorded available stock ({availableStock} {baseUnit}).
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontWeight: 700 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleAddLooseToBill}
            style={{ gap: '8px', fontWeight: 800, padding: '10px 22px' }}
          >
            <CheckCircle2 size={18} />
            <span>ADD TO BILL (₹{calculatedResult.calculatedPrice.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
