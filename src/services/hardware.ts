// Hardware Abstraction Layer for Thermal Printers, Barcode Scanners, Weighing Scales, and Audio Alerts

export interface ReceiptData {
  store_name: string;
  store_tagline?: string;
  address: string;
  phone: string;
  gstin?: string;
  invoice_no: string;
  order_no?: string;
  date_time: string;
  cashier?: string;
  customer_name?: string;
  customer_phone?: string;
  items: {
    name: string;
    qty: string | number;
    unit: string;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  discount: number;
  delivery_charge?: number;
  gst_amount?: number;
  total: number;
  payment_method: string;
  upi_id?: string;
  footer_text?: string;
}

// ----------------------------------------------------
// 1. THERMAL PRINTER ESC/POS FORMATTER & PRINT HANDLER
// ----------------------------------------------------
export class ThermalPrinterAdapter {
  private width: '58mm' | '80mm';

  constructor(width: '58mm' | '80mm' = '80mm') {
    this.width = width;
  }

  setWidth(width: '58mm' | '80mm') {
    this.width = width;
  }

  // Generates clean mono-spaced text receipt for ESC/POS or print preview
  formatReceiptText(data: ReceiptData): string {
    const charsPerLine = this.width === '58mm' ? 32 : 48;
    const divider = '-'.repeat(charsPerLine);
    const doubleDivider = '='.repeat(charsPerLine);

    const center = (str: string) => {
      const pad = Math.max(0, Math.floor((charsPerLine - str.length) / 2));
      return ' '.repeat(pad) + str;
    };

    const row = (left: string, right: string) => {
      const space = Math.max(1, charsPerLine - left.length - right.length);
      return left + ' '.repeat(space) + right;
    };

    let out = '';
    out += center(data.store_name.toUpperCase()) + '\n';
    if (data.store_tagline) out += center(data.store_tagline) + '\n';
    out += center(data.address) + '\n';
    out += center(`Phone: ${data.phone}`) + '\n';
    if (data.gstin) out += center(`GSTIN: ${data.gstin}`) + '\n';
    out += doubleDivider + '\n';
    out += row(`Bill: ${data.invoice_no}`, data.date_time) + '\n';
    if (data.customer_name && data.customer_name !== 'Walk-in Customer') {
      out += row(`Customer: ${data.customer_name}`, data.customer_phone || '') + '\n';
    }
    out += divider + '\n';

    if (this.width === '58mm') {
      out += row('Item', 'Qty x Rate  Amt') + '\n';
      out += divider + '\n';
      data.items.forEach(it => {
        out += it.name.substring(0, charsPerLine) + '\n';
        const rightSide = `${it.qty} ${it.unit} x ₹${it.rate} = ₹${it.amount}`;
        out += ' '.repeat(Math.max(0, charsPerLine - rightSide.length)) + rightSide + '\n';
      });
    } else {
      out += 'Item                         Qty    Rate    Amt\n';
      out += divider + '\n';
      data.items.forEach(it => {
        const nameCol = it.name.substring(0, 24).padEnd(25);
        const qtyCol = `${it.qty} ${it.unit}`.padStart(8);
        const rateCol = `₹${it.rate}`.padStart(7);
        const amtCol = `₹${it.amount}`.padStart(7);
        out += `${nameCol} ${qtyCol} ${rateCol} ${amtCol}\n`;
      });
    }

    out += divider + '\n';
    out += row('Subtotal:', `₹${data.subtotal.toFixed(2)}`) + '\n';
    if (data.discount > 0) {
      out += row('Discount Savings:', `-₹${data.discount.toFixed(2)}`) + '\n';
    }
    if (data.delivery_charge && data.delivery_charge > 0) {
      out += row('Delivery Fee:', `₹${data.delivery_charge.toFixed(2)}`) + '\n';
    }
    if (data.gst_amount && data.gst_amount > 0) {
      out += row('GST Taxes (Included):', `₹${data.gst_amount.toFixed(2)}`) + '\n';
    }
    out += doubleDivider + '\n';
    out += row('NET AMOUNT PAYABLE:', `₹${data.total.toFixed(2)}`) + '\n';
    out += row('Payment Mode:', data.payment_method) + '\n';
    out += doubleDivider + '\n';
    out += center('** THANK YOU FOR SHOPPING! **') + '\n';
    out += center('Save More Every Day • Please Visit Again') + '\n';
    if (data.footer_text) {
      out += center(data.footer_text) + '\n';
    }

    return out;
  }

  // Direct Browser Print
  printReceipt(elementId: string) {
    const printEl = document.getElementById(elementId);
    if (!printEl) {
      window.print();
      return;
    }
    window.print();
  }
}

// ----------------------------------------------------
// 2. BARCODE SCANNER HARDWARE LISTENER (Keyboard Wedge: USB & Bluetooth HID)
// ----------------------------------------------------

export function normalizeBarcode(raw: string): string {
  if (!raw) return '';
  return String(raw)
    .trim()
    .replace(/[\r\n\t\x00-\x1F\x7F]/g, '');
}

export class BarcodeScannerListener {
  private buffer: string = '';
  private lastTime: number = 0;
  private onScanCallback: ((barcode: string) => void) | null = null;
  private onStatusCallback: ((ready: boolean) => void) | null = null;
  private listener: ((e: KeyboardEvent) => void) | null = null;
  private lastScannedBarcode: string = '';
  private lastScannedTime: number = 0;
  private isConnected: boolean = false;

  connect(onScan: (barcode: string) => void, onStatusChange?: (ready: boolean) => void) {
    this.onScanCallback = onScan;
    this.onStatusCallback = onStatusChange || null;
    this.isConnected = true;
    if (this.onStatusCallback) this.onStatusCallback(true);

    this.listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const diff = now - this.lastTime;
      this.lastTime = now;

      // Terminators typical of retail USB/Bluetooth scanners: Enter or Tab
      if (e.key === 'Enter' || e.key === 'Tab') {
        const raw = this.buffer;
        const code = normalizeBarcode(raw);
        this.buffer = '';

        if (code.length >= 4) {
          // Scanner burst detected
          e.preventDefault();

          // Debounce duplicate hardware bounces (< 250ms with identical code)
          if (code === this.lastScannedBarcode && now - this.lastScannedTime < 250) {
            return;
          }

          this.lastScannedBarcode = code;
          this.lastScannedTime = now;

          if (this.onScanCallback) {
            this.playBeep('success');
            this.onScanCallback(code);
          }
        }
      } else if (e.key && e.key.length === 1) {
        // Inter-character interval for hardware scanners is ultra-fast (< 65ms)
        // If delay is large, clear buffer unless starting a new sequence
        if (diff > 90 && this.buffer.length > 0) {
          this.buffer = '';
        }

        // If inside an input field, only capture if typing speed indicates a scanner (< 65ms)
        if (!isInput || diff < 65 || this.buffer.length > 3) {
          this.buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', this.listener, true);
  }

  disconnect() {
    if (this.listener) {
      window.removeEventListener('keydown', this.listener, true);
      this.listener = null;
    }
    this.isConnected = false;
    if (this.onStatusCallback) this.onStatusCallback(false);
  }

  onStatusChange(callback: (ready: boolean) => void) {
    this.onStatusCallback = callback;
    if (this.onStatusCallback) {
      this.onStatusCallback(this.isConnected);
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  playBeep(type: 'success' | 'alert' | 'error' = 'success') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'alert') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046, audioCtx.currentTime); // C6
        osc.frequency.setValueAtTime(1318, audioCtx.currentTime + 0.06); // E6
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.16);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {}
  }
}

// ----------------------------------------------------
// 3. DIGITAL WEIGHING SCALE HARDWARE ADAPTER (Simulated + WebSerial)
// ----------------------------------------------------
export class WeighingScaleAdapter {
  private isConnected: boolean = false;
  private currentWeight: number = 0.000;
  private isStable: boolean = true;
  private tareWeight: number = 0.000;
  private simulatedInterval: any = null;

  connectSimulated(onWeightChange: (weight: number, isStable: boolean) => void) {
    this.isConnected = true;
    this.currentWeight = 1.250;
    this.isStable = true;

    // Simulate minor scale fluctuation settling to stable
    this.simulatedInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        this.isStable = false;
        const delta = (Math.random() - 0.5) * 0.01;
        const gross = Math.max(0, this.currentWeight + delta - this.tareWeight);
        onWeightChange(Math.round(gross * 1000) / 1000, false);

        setTimeout(() => {
          this.isStable = true;
          onWeightChange(Math.round(this.currentWeight * 1000) / 1000, true);
        }, 400);
      }
    }, 2500);

    onWeightChange(this.currentWeight, true);
  }

  setWeight(weight: number) {
    this.currentWeight = Math.max(0, weight);
  }

  tare() {
    this.tareWeight = this.currentWeight;
    this.currentWeight = 0;
  }

  zero() {
    this.tareWeight = 0;
    this.currentWeight = 0;
  }

  disconnect() {
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }
    this.isConnected = false;
  }
}

// ----------------------------------------------------
// 4. AUDIO CHIME (For New Online Order Notifications)
// ----------------------------------------------------
export function playOrderChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play pleasant two-tone doorbell chime (E5 -> G#5)
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);

      gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime + start);
      osc.stop(audioCtx.currentTime + start + duration);
    };

    playTone(659.25, 0, 0.4);     // E5
    playTone(830.61, 0.25, 0.7);  // G#5
  } catch (e) {
    console.warn('Audio chime could not play:', e);
  }
}

export const thermalPrinter = new ThermalPrinterAdapter('80mm');
export const barcodeScanner = new BarcodeScannerListener();
export const weighingScale = new WeighingScaleAdapter();
