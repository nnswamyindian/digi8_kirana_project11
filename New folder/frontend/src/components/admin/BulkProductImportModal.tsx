import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { BulkImportValidationResult, BulkImportConfirmResult, BulkImportRow } from '../../types';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';

interface BulkProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const BulkProductImportModal: React.FC<BulkProductImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BulkImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'create_only' | 'create_and_update'>('create_only');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportConfirmResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'warnings' | 'valid'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download official sample Excel template
  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grocery_product_bulk_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download sample Excel template');
    }
  };

  // 2. Handle file selection & validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setErrorMessage('Please upload a valid spreadsheet file (.xlsx, .xls, or .csv)');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setImportResult(null);
    setIsValidating(true);

    try {
      const result = await api.validateProductImport(file);
      setValidationResult(result);
      if (result.errorCount > 0) {
        setActiveTab('errors');
      } else {
        setActiveTab('all');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error parsing and validating Excel file.');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  // 3. Confirm and commit import
  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.rows.length === 0) return;

    if (validationResult.errorCount > 0) {
      const proceed = window.confirm(
        `There are ${validationResult.errorCount} rows with errors. The system will skip invalid rows and import ${validationResult.validCount} valid products. Do you want to proceed?`
      );
      if (!proceed) return;
    }

    setIsImporting(true);
    setErrorMessage('');

    try {
      const res = await api.confirmProductImport(validationResult.rows, importMode);
      setImportResult(res);
      onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete bulk product import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredRows = validationResult?.rows.filter((row: BulkImportRow) => {
    if (activeTab === 'errors') return row.status_type === 'ERROR';
    if (activeTab === 'warnings') return row.status_type === 'WARNING';
    if (activeTab === 'valid') return row.status_type === 'VALID';
    return true;
  }) || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Bulk Product Import (Excel / CSV)
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Quickly add or update catalog items with automatic validation and duplicate detection
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Download standard 4-sheet template"
            >
              <Download size={15} />
              <span>Download Sample Excel</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px'
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Upload Dropzone if no file or resetting */}
          {!validationResult && !importResult && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: isValidating ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isValidating}
                />
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  {isValidating ? <RefreshCw size={28} className="animate-spin" /> : <Upload size={28} />}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>
                  {isValidating ? 'Validating Excel Sheet...' : 'Click to Upload or Drag and Drop Excel File'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px 0' }}>
                  Supported formats: <strong>.xlsx</strong> (recommended), <strong>.xls</strong>, or <strong>.csv</strong>
                </p>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f1f5f9',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#475569'
                  }}
                >
                  <ShieldCheck size={14} color="#059669" />
                  <span>Tenant Isolation & Duplicate Barcode Checks Applied Automatically</span>
                </div>
              </div>

              {/* Helpful instructions card */}
              <div
                style={{
                  marginTop: '24px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 20px'
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                  📋 Import Guidelines & Structure
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '0.825rem', color: '#475569' }}>
                  <div>• Download the official sample template with 4 predefined sheets.</div>
                  <div>• Keep header column names intact (Sheet 1: Products).</div>
                  <div>• Barcode & SKU must be unique within your store.</div>
                  <div>• Valid Units: KG, GRAM, LITRE, ML, PACKET, BOX, PIECE, etc.</div>
                  <div>• Stock transactions (OPENING_STOCK) recorded automatically.</div>
                  <div>• Products with 0 stock are saved as OUT OF STOCK (never deleted).</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Validation Preview Screen */}
          {validationResult && !importResult && (
            <div>
              {/* File details & KPI cards */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={20} color="#10b981" />
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedFile?.name}</span>
                  <button
                    onClick={handleReset}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                  >
                    Change File
                  </button>
                </div>

                {/* Import Mode Radio Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Import Mode:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'create_only'}
                      onChange={() => setImportMode('create_only')}
                    />
                    <span>Create New Only</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'create_and_update'}
                      onChange={() => setImportMode('create_and_update')}
                    />
                    <span>Create + Update Existing</span>
                  </label>
                </div>
              </div>

              {/* Status KPI Counters */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '20px'
                }}
              >
                <div
                  onClick={() => setActiveTab('all')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: activeTab === 'all' ? '#e2e8f0' : '#f8fafc',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL ROWS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>
                    {validationResult.totalRows}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('valid')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: activeTab === 'valid' ? '#dcfce7' : '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> VALID
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#15803d' }}>
                    {validationResult.validCount}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('warnings')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: activeTab === 'warnings' ? '#fef3c7' : '#fffbeb',
                    border: '1px solid #fde68a',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={14} /> WARNINGS
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b45309' }}>
                    {validationResult.warningCount}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('errors')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: activeTab === 'errors' ? '#fee2e2' : '#fef2f2',
                    border: '1px solid #fecaca',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={14} /> ERRORS
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b91c1c' }}>
                    {validationResult.errorCount}
                  </div>
                </div>
              </div>

              {/* Rows Preview Table */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '360px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px 12px' }}>Row</th>
                        <th style={{ padding: '10px 12px' }}>Product Name</th>
                        <th style={{ padding: '10px 12px' }}>Barcode</th>
                        <th style={{ padding: '10px 12px' }}>SKU</th>
                        <th style={{ padding: '10px 12px' }}>Category</th>
                        <th style={{ padding: '10px 12px' }}>Selling / Cost</th>
                        <th style={{ padding: '10px 12px' }}>Stock</th>
                        <th style={{ padding: '10px 12px' }}>Status & Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            No rows matching the "{activeTab}" filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: row.status_type === 'ERROR' ? '#fff5f5' : row.status_type === 'WARNING' ? '#fffdf0' : 'white'
                            }}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>#{row.rowNumber}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                              {row.name || <em style={{ color: '#ef4444' }}>Missing name</em>}
                            </td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{row.barcode || '—'}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{row.sku || '—'}</td>
                            <td style={{ padding: '10px 12px' }}>{row.category}</td>
                            <td style={{ padding: '10px 12px' }}>
                              ₹{row.sellingPrice} / ₹{row.purchasePrice}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {row.openingStock} {row.unit}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {row.status_type === 'VALID' && (
                                <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                  ✓ Valid
                                </span>
                              )}
                              {row.status_type === 'WARNING' && (
                                <div>
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    ⚠️ Warning
                                  </span>
                                  <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '2px' }}>
                                    {row.problems.join('; ')}
                                  </div>
                                </div>
                              )}
                              {row.status_type === 'ERROR' && (
                                <div>
                                  <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    ✕ Error
                                  </span>
                                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px', fontWeight: 500 }}>
                                    {row.problems.join('; ')}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Completed Result Screen */}
          {importResult && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}
              >
                <Check size={32} />
              </div>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                Bulk Import Completed Successfully!
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 24px 0' }}>
                All valid products have been committed transactionally with inventory opening balances.
              </p>

              <div
                style={{
                  display: 'inline-grid',
                  gridTemplateColumns: 'repeat(4, 120px)',
                  gap: '12px',
                  margin: '0 auto 24px auto',
                  textAlign: 'center'
                }}
              >
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>CREATED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#166534' }}>{importResult.createdCount}</div>
                </div>

                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>UPDATED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e40af' }}>{importResult.updatedCount}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>SKIPPED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#475569' }}>{importResult.skippedCount}</div>
                </div>

                <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>ERRORS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#991b1b' }}>{importResult.errorCount}</div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto 20px auto', background: '#fff1f2', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontWeight: 600, color: '#9f1239', fontSize: '0.85rem', marginBottom: '6px' }}>Specific Row Errors:</div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#be123c' }}>
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}
        >
          {importResult ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  handleReset();
                }}
              >
                Close & View Products
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isImporting}
              >
                Cancel
              </button>

              {validationResult && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleReset}
                    disabled={isImporting}
                  >
                    Re-upload File
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmImport}
                    disabled={isImporting || validationResult.validCount === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Importing Records...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck size={16} />
                        <span>
                          Confirm & Import ({validationResult.validCount} Valid Products)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
