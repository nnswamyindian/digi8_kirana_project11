import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Keyboard, CheckCircle2 } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Product Barcode',
  continuous = false
}) => {
  const [cameraError, setCameraError] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'pos-barcode-scanner-reader';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsInitializing(true);
    setCameraError('');
    setLastScanned(null);

    const initScanner = async () => {
      try {
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        const html5QrCode = new Html5Qrcode(scannerDivId, {
          formatsToSupport,
          verbose: false
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!isMounted) return;
            // Play feedback sound if possible
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.frequency.value = 880; // A5 note
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.1);
            } catch {}

            setLastScanned(decodedText);
            onScanSuccess(decodedText);

            if (!continuous) {
              handleStopAndClose();
            }
          },
          () => {
            // Frame scan without match, ignore
          }
        );

        if (isMounted) setIsInitializing(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[Camera Scanner Error]', err);
        setIsInitializing(false);
        setCameraError(
          err.message || 'Camera permission denied or camera not found. You can enter the barcode manually below.'
        );
      }
    };

    // Small delay to ensure DOM container is rendered
    const timer = setTimeout(() => {
      initScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {}
      }
    };
  }, [isOpen]);

  const handleStopAndClose = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {}
    }
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    onScanSuccess(manualBarcode.trim());
    setManualBarcode('');
    if (!continuous) {
      handleStopAndClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
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
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="#0284c7" />
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{title}</span>
          </div>
          <button
            onClick={handleStopAndClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scanner View Area */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Reader Target */}
          <div
            id={scannerDivId}
            style={{
              width: '100%',
              maxWidth: '380px',
              minHeight: '260px',
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              display: cameraError ? 'none' : 'block'
            }}
          />

          {isInitializing && !cameraError && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '0.85rem' }}>Requesting camera access...</div>
            </div>
          )}

          {/* Scanned Feedback */}
          {lastScanned && (
            <div
              style={{
                marginTop: '12px',
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#15803d',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={16} />
              <span>Scanned: {lastScanned}</span>
            </div>
          )}

          {/* Camera Permission / Error Fallback */}
          {cameraError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                width: '100%',
                marginBottom: '16px',
                display: 'flex',
                gap: '10px'
              }}
            >
              <AlertCircle size={20} color="#b91c1c" style={{ flexShrink: 0 }} />
              <div>
                <strong>Camera Unavailable:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#b91c1c' }}>{cameraError}</p>
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#7f1d1d' }}>
                  💡 USB and Bluetooth barcode scanners function as standard keyboard input without needing camera permissions.
                </div>
              </div>
            </div>
          )}

          {/* Manual Barcode Input Fallback */}
          <form
            onSubmit={handleManualSubmit}
            style={{ width: '100%', marginTop: '16px', display: 'flex', gap: '8px' }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Or type/paste barcode manually..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
              <Keyboard
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '12px' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!manualBarcode.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              Add
            </button>
          </form>

          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '12px 0 0 0', textAlign: 'center' }}>
            Supports EAN-13, EAN-8, UPC, Code 128, Code 39, ITF & QR codes
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button className="btn btn-secondary btn-sm" onClick={handleStopAndClose}>
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
