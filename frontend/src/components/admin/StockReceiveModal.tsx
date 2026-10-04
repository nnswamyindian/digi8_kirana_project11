import React, { useState } from 'react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import {
  PackagePlus,
  Barcode,
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  TrendingUp,
  Truck
} from 'lucide-react';

interface StockReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onReceiveSuccess: () => void;
}

export const StockReceiveModal: React.FC<StockReceiveModalProps> = ({
  isOpen,
  onClose,
  products,
  onReceiveSuccess
}) => {
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Form Fields
  const [receivedQty, setReceivedQty] = useState<number>(10);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [updatePurchasePrice, setUpdatePurchasePrice] = useState(true);
  const [updateSellingPrice, setUpdateSellingPrice] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleLookupBarcode = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setIsSearching(true);
    setSearchError('');
    setSuccessMessage('');

    // Check local list first
    let found = products.find(p => p.barcode === clean || (p.sku && p.sku === clean));
    if (!found) {
      try {
        const res = await api.getProductByBarcode(clean);
        if (res && res.id) found = res;
      } catch (err: any) {
        setSearchError(`Product with barcode "${clean}" not found.`);
      }
    }

    if (found) {
      setSelectedProduct(found);
      setBarcodeQuery(clean);
      setPurchasePrice(found.purchase_cost || 0);
      setSellingPrice(found.selling_price || 0);
      setReceivedQty(10);
    } else {
      setSelectedProduct(null);
    }
    setIsSearching(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (receivedQty <= 0) {
      alert('Please enter a received quantity greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setSearchError('');

    try {
      await api.receiveStock({
        product_id: selectedProduct.id,
        barcode: selectedProduct.barcode,
        received_quantity: receivedQty,
        purchase_price: purchasePrice,
        supplier: supplier.trim() || undefined,
        update_master_purchase_price: updatePurchasePrice,
        update_master_selling_price: updateSellingPrice,
        new_selling_price: updateSellingPrice ? sellingPrice : undefined,
        notes: notes.trim() || `Received ${receivedQty} ${selectedProduct.unit} from ${supplier || 'Supplier'}`
      });

      setSuccessMessage(`Successfully added ${receivedQty} ${selectedProduct.unit} to ${selectedProduct.name}!`);
      onReceiveSuccess();
      setTimeout(() => {
        handleReset();
      }, 1800);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to record stock receive.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setBarcodeQuery('');
    setSearchError('');
    setSuccessMessage('');
    setReceivedQty(10);
    setSupplier('');
    setNotes('');
  };

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
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#0284c7',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PackagePlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Stock Receive by Barcode
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Quick inventory receiving with purchase cost & supplier tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px', overflowY: 'auto', maxHeight: '75vh' }}>
          {successMessage && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {searchError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              <AlertCircle size={18} />
              <span>{searchError}</span>
            </div>
          )}

          {/* Barcode Search / Scan Bar */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              SCAN BARCODE OR SEARCH PRODUCT
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Barcode size={18} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Scan barcode or enter SKU / name..."
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupBarcode(barcodeQuery);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleLookupBarcode(barcodeQuery)}
                disabled={isSearching || !barcodeQuery.trim()}
              >
                {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                <span>Find</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsCameraScannerOpen(true)}
                title="Scan with Camera"
                style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
              >
                <Camera size={14} />
                <span>Camera</span>
              </button>
            </div>
          </div>

          {/* Product Details & Stock Receive Form */}
          {selectedProduct ? (
            <form onSubmit={handleFormSubmit}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>
                      {selectedProduct.name}
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {selectedProduct.brand || 'Generic'} • {selectedProduct.category_name || 'Grocery'} • Barcode: {selectedProduct.barcode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Change Product
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginTop: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>CURRENT STOCK</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedProduct.stock} {selectedProduct.unit}
                    </div>
                  </div>

                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>PURCHASE COST</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>
                      ₹{selectedProduct.purchase_cost}
                    </div>
                  </div>

                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SELLING PRICE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
                      ₹{selectedProduct.selling_price}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    How Many Received? ({selectedProduct.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    min="0.01"
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '2px solid #0284c7',
                      fontSize: '1rem',
                      fontWeight: 700
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
                    → New Stock: {(selectedProduct.stock + receivedQty).toFixed(2)} {selectedProduct.unit}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Batch Purchase Cost (₹ / unit)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', marginTop: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={updatePurchasePrice}
                      onChange={(e) => setUpdatePurchasePrice(e.target.checked)}
                    />
                    <span>Update catalog purchase cost</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Supplier / Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Wholesale, Rice Mill"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Store Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!updateSellingPrice}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      background: updateSellingPrice ? 'white' : '#f1f5f9'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', marginTop: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={updateSellingPrice}
                      onChange={(e) => setUpdateSellingPrice(e.target.checked)}
                    />
                    <span>Revise store retail price</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Invoice / Purchase Note
                </label>
                <input
                  type="text"
                  placeholder="Optional reference or invoice #"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={isSubmitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || receivedQty <= 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Updating Inventory...</span>
                    </>
                  ) : (
                    <>
                      <PackagePlus size={16} />
                      <span>Confirm Stock Receive (+{receivedQty})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '36px 16px',
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <Truck size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#334155' }}>
                Scan product barcode or search by name to receive fresh stock
              </p>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Inventory transactions and cost history will be logged automatically
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsCameraScannerOpen(false);
          handleLookupBarcode(code);
        }}
        title="Scan Barcode to Receive Stock"
      />
    </div>
  );
};
