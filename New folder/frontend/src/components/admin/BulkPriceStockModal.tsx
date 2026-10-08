import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
  XCircle, RefreshCw, X, Download, Tag, Package, ArrowRight
} from 'lucide-react';

interface BulkPriceStockRow {
  rowNum: number;
  barcode: string;
  productName?: string;
  found: boolean;
  currentCost?: number;
  currentSelling?: number;
  currentStock?: number;
  newCost?: number;
  newSelling?: number;
  newMrp?: number;
  newStock?: number;      // absolute set
  addStock?: number;      // +qty
  errors: string[];
  warnings: string[];
}

interface BulkPriceStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Column mapping ───────────────────────────────────────────────────────────
const REQUIRED_COLS = ['barcode'];
const OPTIONAL_COLS = ['new_cost', 'new_selling_price', 'new_mrp', 'add_stock', 'set_stock'];

// ─── CSV / Tab-separated parser ───────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(sep);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

const TEMPLATE_CSV = `barcode,new_cost,new_selling_price,new_mrp,add_stock,set_stock
8901030594469,45,55,60,,
8901030897483,,,,,50
8906026320017,30,40,45,20,
`;

export const BulkPriceStockModal: React.FC<BulkPriceStockModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [rows, setRows] = useState<BulkPriceStockRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [resultOk, setResultOk] = useState(0);
  const [resultFail, setResultFail] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setRows([]);
    setErrorMsg('');
    setResultMsg('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Download template CSV ──────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_price_stock_update_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Parse & validate uploaded file ────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setIsProcessing(true);

    try {
      const text = await file.text();
      const rawRows = parseCSV(text);

      if (rawRows.length === 0) {
        setErrorMsg('File appears empty or headers are missing. Please use the template.');
        setIsProcessing(false);
        return;
      }

      if (!rawRows[0].hasOwnProperty('barcode')) {
        setErrorMsg('Missing required "barcode" column. Please download and use the provided template.');
        setIsProcessing(false);
        return;
      }

      // Validate & look up each barcode via backend
      const parsed: BulkPriceStockRow[] = [];
      for (let i = 0; i < rawRows.length; i++) {
        const raw = rawRows[i];
        const barcode = (raw.barcode || '').trim();
        const rowNum = i + 2; // 1-indexed, +1 for header
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!barcode) {
          errors.push('Barcode is empty — row skipped.');
          parsed.push({ rowNum, barcode, found: false, errors, warnings });
          continue;
        }

        // Parse numeric fields
        const newCost = raw.new_cost ? parseFloat(raw.new_cost) : undefined;
        const newSelling = raw.new_selling_price ? parseFloat(raw.new_selling_price) : undefined;
        const newMrp = raw.new_mrp ? parseFloat(raw.new_mrp) : undefined;
        const addStock = raw.add_stock ? parseFloat(raw.add_stock) : undefined;
        const setStock = raw.set_stock ? parseFloat(raw.set_stock) : undefined;

        // Basic cross-field validations
        if (newCost !== undefined && isNaN(newCost)) errors.push('new_cost is not a valid number.');
        if (newSelling !== undefined && isNaN(newSelling)) errors.push('new_selling_price is not a valid number.');
        if (newMrp !== undefined && isNaN(newMrp)) errors.push('new_mrp is not a valid number.');
        if (addStock !== undefined && (isNaN(addStock) || addStock < 0)) errors.push('add_stock must be a positive number.');
        if (setStock !== undefined && (isNaN(setStock) || setStock < 0)) errors.push('set_stock must be ≥ 0.');
        if (addStock !== undefined && setStock !== undefined) warnings.push('Both add_stock and set_stock set — set_stock takes priority.');
        if (!newCost && !newSelling && !newMrp && addStock === undefined && setStock === undefined) {
          warnings.push('No changes specified for this row — will be skipped on apply.');
        }
        if (newSelling !== undefined && newCost !== undefined && newSelling < newCost) {
          warnings.push(`Selling price ₹${newSelling} < cost ₹${newCost} — margin will be negative.`);
        }
        if (newSelling !== undefined && newMrp !== undefined && newSelling > newMrp) {
          warnings.push(`Selling price ₹${newSelling} exceeds MRP ₹${newMrp}.`);
        }

        // Look up product by barcode
        let found = false;
        let productName: string | undefined;
        let currentCost: number | undefined;
        let currentSelling: number | undefined;
        let currentStock: number | undefined;
        if (errors.length === 0) {
          try {
            const res = await api.lookupProductByBarcode(barcode);
            if (res.found && res.product) {
              found = true;
              productName = res.product.name;
              currentCost = Number(res.product.purchase_cost);
              currentSelling = Number(res.product.selling_price);
              currentStock = Number(res.product.stock);
            } else {
              errors.push(`Barcode "${barcode}" not found in your product catalog.`);
            }
          } catch {
            errors.push('Could not look up barcode — server error.');
          }
        }

        parsed.push({
          rowNum, barcode, found, productName,
          currentCost, currentSelling, currentStock,
          newCost, newSelling, newMrp,
          newStock: setStock,
          addStock,
          errors, warnings,
        });
      }

      setRows(parsed);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg('Failed to parse file: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Apply updates ──────────────────────────────────────────────────────────
  const handleApply = async () => {
    const applicable = rows.filter(r => r.found && r.errors.length === 0);
    if (applicable.length === 0) return;

    setIsProcessing(true);
    let ok = 0;
    let fail = 0;
    const failMessages: string[] = [];

    for (const row of applicable) {
      const hasAnyChange = row.newCost !== undefined || row.newSelling !== undefined ||
        row.newMrp !== undefined || row.newStock !== undefined || row.addStock !== undefined;
      if (!hasAnyChange) continue;

      try {
        await api.updateProductPriceAndStock(row.barcode, {
          new_cost: row.newCost,
          new_selling_price: row.newSelling,
          new_mrp: row.newMrp,
          set_stock: row.newStock,
          add_stock: row.addStock,
        });
        ok++;
      } catch (err: any) {
        fail++;
        failMessages.push(`Row ${row.rowNum} (${row.barcode}): ${err.message}`);
      }
    }

    setResultOk(ok);
    setResultFail(fail);
    setResultMsg(failMessages.join('\n'));
    setStep('result');
    setIsProcessing(false);
    if (ok > 0) onSuccess();
  };

  // ─── COUNTS ──────────────────────────────────────────────────────────────
  const validRows = rows.filter(r => r.found && r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);
  const warnRows = rows.filter(r => r.errors.length === 0 && r.warnings.length > 0);

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '820px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={20} color="var(--primary-700)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Bulk Price & Stock Update</h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                Update selling prices, costs, MRP and stock levels for multiple products via CSV
              </div>
            </div>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>

              {/* Template download */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9rem', marginBottom: 8 }}>📋 CSV Template Format</div>
                <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: 10 }}>
                  Download the template and fill in only the columns you want to change. Leave cells blank to keep existing values.
                </div>
                <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#334155', marginBottom: 10, overflowX: 'auto' }}>
                  barcode, new_cost, new_selling_price, new_mrp, add_stock, set_stock
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 10 }}>
                  <strong>add_stock</strong> = add this qty to existing stock (e.g. 20 received units)<br />
                  <strong>set_stock</strong> = overwrite stock to exact value (e.g. after physical count)
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleDownloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} /> Download CSV Template
                </button>
              </div>

              {/* Upload dropzone */}
              <div
                style={{
                  border: '2px dashed #cbd5e1', borderRadius: 14, padding: '40px 24px',
                  cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s',
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary-500)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  const f = e.dataTransfer.files[0];
                  if (f && fileRef.current) {
                    const dt = new DataTransfer();
                    dt.items.add(f);
                    fileRef.current.files = dt.files;
                    fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                {isProcessing ? (
                  <div style={{ color: '#64748b' }}>
                    <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700 }}>Validating rows against your catalog…</div>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, color: '#475569', fontSize: '1rem' }}>
                      Drop your CSV file here, or click to browse
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 6 }}>
                      Supports .csv and .txt (Tab or comma separated)
                    </div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileChange} />

              {errorMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontWeight: 600, fontSize: '0.85rem', marginTop: 14, textAlign: 'left' }}>
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: PREVIEW ── */}
          {step === 'preview' && (
            <>
              {/* Summary chips */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ padding: '5px 14px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.8rem' }}>
                  ✅ {validRows.length} will update
                </span>
                <span style={{ padding: '5px 14px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem' }}>
                  ❌ {errorRows.length} errors
                </span>
                <span style={{ padding: '5px 14px', borderRadius: 20, background: '#fefce8', color: '#b45309', fontWeight: 700, fontSize: '0.8rem' }}>
                  ⚠️ {warnRows.length} warnings
                </span>
                <span style={{ padding: '5px 14px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>
                  📋 {rows.length} total rows
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Row', 'Barcode', 'Product', 'Cost', 'Selling', 'MRP', 'Stock Change', 'Status'].map(h => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.rowNum} style={{ borderBottom: '1px solid #f1f5f9', background: row.errors.length > 0 ? '#fff9f9' : 'white' }}>
                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 700 }}>#{row.rowNum}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700 }}>{row.barcode}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {row.found ? <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.productName}</span>
                            : <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>Not found</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {row.newCost !== undefined ? (
                            <span>
                              <span style={{ color: '#94a3b8', textDecoration: 'line-through', marginRight: 4 }}>₹{row.currentCost?.toFixed(2)}</span>
                              <strong style={{ color: '#0f172a' }}>→ ₹{row.newCost.toFixed(2)}</strong>
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {row.newSelling !== undefined ? (
                            <span>
                              <span style={{ color: '#94a3b8', textDecoration: 'line-through', marginRight: 4 }}>₹{row.currentSelling?.toFixed(2)}</span>
                              <strong style={{ color: row.newSelling < (row.currentCost || 0) ? '#dc2626' : '#16a34a' }}>→ ₹{row.newSelling.toFixed(2)}</strong>
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {row.newMrp !== undefined ? <strong>₹{row.newMrp.toFixed(2)}</strong> : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {row.newStock !== undefined ? (
                            <span><span style={{ color: '#94a3b8' }}>{row.currentStock}</span> <strong style={{ color: '#7c3aed' }}>→ {row.newStock} (set)</strong></span>
                          ) : row.addStock !== undefined ? (
                            <span style={{ color: '#0891b2', fontWeight: 700 }}>+{row.addStock} units</span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {row.errors.length > 0 ? (
                            <div>
                              {row.errors.map((e, i) => (
                                <div key={i} style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>❌ {e}</div>
                              ))}
                            </div>
                          ) : row.warnings.length > 0 ? (
                            <div>
                              {row.warnings.map((w, i) => (
                                <div key={i} style={{ color: '#b45309', fontSize: '0.72rem' }}>⚠️ {w}</div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>✅ Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── STEP 3: RESULT ── */}
          {step === 'result' && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: '4rem', marginBottom: 12 }}>{resultFail === 0 ? '🎉' : '⚠️'}</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                {resultFail === 0 ? 'All Updates Applied!' : 'Partially Applied'}
              </h3>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ padding: '10px 22px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '1.1rem' }}>
                  ✅ {resultOk} Updated
                </div>
                {resultFail > 0 && (
                  <div style={{ padding: '10px 22px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontWeight: 800, fontSize: '1.1rem' }}>
                    ❌ {resultFail} Failed
                  </div>
                )}
              </div>
              {resultMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: '#dc2626', marginTop: 12, whiteSpace: 'pre-line' }}>
                  {resultMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          {step === 'upload' && (
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          )}

          {step === 'preview' && (
            <>
              <button className="btn btn-secondary" onClick={handleReset} disabled={isProcessing}>
                Re-upload File
              </button>
              <button className="btn btn-primary" onClick={handleApply}
                disabled={isProcessing || validRows.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isProcessing ? (
                  <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /><span>Applying...</span></>
                ) : (
                  <><ArrowRight size={16} /><span>Apply {validRows.length} Updates</span></>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={handleReset}>Update More</button>
              <button className="btn btn-primary" onClick={() => { onClose(); handleReset(); }}>
                Close & Refresh
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
