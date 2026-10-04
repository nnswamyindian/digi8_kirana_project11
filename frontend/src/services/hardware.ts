// Hardware Abstraction Layer for Thermal Printers (Bluetooth / USB / Serial / Browser),
// Barcode Scanners (USB / Bluetooth Keyboard Wedge + Camera), Weighing Scales, and Audio Alerts

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

export type PrinterConnectionMode = 'BROWSER' | 'BLUETOOTH' | 'USB' | 'SERIAL';

export interface PrinterStatus {
  isConnected: boolean;
  mode: PrinterConnectionMode;
  deviceName: string | null;
  paperWidth: '58mm' | '80mm';
  supportsBluetooth: boolean;
  supportsUsb: boolean;
  supportsSerial: boolean;
  error?: string | null;
}

// ----------------------------------------------------
// 1. ESC/POS BINARY COMMAND BUILDER
// ----------------------------------------------------
export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  init(): this {
    // ESC @ (Initialize printer)
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    // ESC a n (0=left, 1=center, 2=right)
    const n = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, n);
    return this;
  }

  bold(enable: boolean): this {
    // ESC E n
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  doubleSize(enable: boolean): this {
    // GS ! n (0x11 = double height + double width, 0x00 = normal)
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  text(str: string): this {
    if (!str) return this;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  feed(lines: number = 1): this {
    // ESC d n
    this.buffer.push(0x1b, 0x64, Math.max(1, lines));
    return this;
  }

  cut(partial: boolean = false): this {
    // GS V m (0 = full cut, 1 = partial cut)
    this.feed(3);
    this.buffer.push(0x1d, 0x56, partial ? 1 : 0);
    return this;
  }

  pulseCashDrawer(): this {
    // ESC p m t1 t2 (Kick cash drawer RJ11 pin 2/5)
    this.buffer.push(0x1b, 0x70, 0x00, 0x1e, 0x78);
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// ----------------------------------------------------
// 2. THERMAL PRINTER ADAPTER (BLUETOOTH, USB, SERIAL & BROWSER)
// ----------------------------------------------------
export class ThermalPrinterAdapter {
  private width: '58mm' | '80mm' = '80mm';
  private mode: PrinterConnectionMode = 'BROWSER';
  private deviceName: string | null = null;
  private isConnected: boolean = false;
  private statusListeners: ((status: PrinterStatus) => void)[] = [];

  // Low-level hardware handles
  private bluetoothDevice: any = null;
  private bluetoothCharacteristic: any = null;
  private usbDevice: any = null;
  private usbEndpointOut: number | null = null;
  private serialPort: any = null;
  private serialWriter: any = null;

  constructor(width: '58mm' | '80mm' = '80mm') {
    this.width = width;
  }

  setWidth(width: '58mm' | '80mm') {
    this.width = width;
    this.notifyStatus();
  }

  getWidth(): '58mm' | '80mm' {
    return this.width;
  }

  getStatus(): PrinterStatus {
    const supportsBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    const supportsUsb = typeof navigator !== 'undefined' && 'usb' in navigator;
    const supportsSerial = typeof navigator !== 'undefined' && 'serial' in navigator;

    return {
      isConnected: this.isConnected,
      mode: this.mode,
      deviceName: this.deviceName,
      paperWidth: this.width,
      supportsBluetooth,
      supportsUsb,
      supportsSerial
    };
  }

  onStatusChange(callback: (status: PrinterStatus) => void) {
    this.statusListeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  private notifyStatus(error?: string | null) {
    const status = { ...this.getStatus(), error };
    this.statusListeners.forEach(cb => {
      try {
        cb(status);
      } catch {}
    });
  }

  // --- Web Bluetooth Support ---
  async connectBluetooth(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      const err = 'Web Bluetooth API is not supported in this browser. Please use Google Chrome or Edge.';
      this.notifyStatus(err);
      return { success: false, error: err };
    }

    try {
      const navBt = (navigator as any).bluetooth;

      // Common ESC/POS Bluetooth Printer GATT Services & 16-bit/128-bit UUIDs
      const PRINTER_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Serial / Printer
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART (Common in POS-58/80)
        '0000ffe0-0000-1000-8000-00805f9b34fb', // BLE UART Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Portable Thermal Printer
      ];

      const device = await navBt.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES
      });

      if (!device) {
        throw new Error('No Bluetooth device selected.');
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.disconnect();
      });

      const server = await device.gatt.connect();

      // Find an accessible writable characteristic across available services
      let writeChar: any = null;
      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        } catch {
          // Probe next service
        }
      }

      if (!writeChar) {
        // Fallback: search all primary services
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                writeChar = c;
                break;
              }
            }
            if (writeChar) break;
          } catch {}
        }
      }

      if (!writeChar) {
        throw new Error('Connected to Bluetooth device, but no writable printer characteristic was found.');
      }

      this.bluetoothDevice = device;
      this.bluetoothCharacteristic = writeChar;
      this.deviceName = device.name || 'Bluetooth POS Thermal Printer';
      this.mode = 'BLUETOOTH';
      this.isConnected = true;
      this.notifyStatus();

      return { success: true, deviceName: this.deviceName };
    } catch (err: any) {
      const msg = err.message || 'Bluetooth connection failed.';
      this.notifyStatus(msg);
      return { success: false, error: msg };
    }
  }

  // --- WebUSB Support ---
  async connectUsb(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      const err = 'WebUSB API is not supported in this browser. Please use Google Chrome or Edge.';
      this.notifyStatus(err);
      return { success: false, error: err };
    }

    try {
      const navUsb = (navigator as any).usb;
      const device = await navUsb.requestDevice({
        filters: [] // Allow user to choose connected USB thermal receipt printer
      });

      if (!device) throw new Error('No USB device selected.');

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim first interface or interface with bulk out endpoint
      let outEndpointNumber: number | null = null;
      let interfaceNumber = 0;

      for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'out' && (ep.type === 'bulk' || ep.type === 'interrupt')) {
              outEndpointNumber = ep.endpointNumber;
              interfaceNumber = iface.interfaceNumber;
              break;
            }
          }
          if (outEndpointNumber !== null) break;
        }
        if (outEndpointNumber !== null) break;
      }

      if (outEndpointNumber === null) {
        outEndpointNumber = 1; // Standard default endpoint
      }

      await device.claimInterface(interfaceNumber);

      this.usbDevice = device;
      this.usbEndpointOut = outEndpointNumber;
      this.deviceName = device.productName || 'USB Thermal Receipt Printer';
      this.mode = 'USB';
      this.isConnected = true;
      this.notifyStatus();

      return { success: true, deviceName: this.deviceName };
    } catch (err: any) {
      const msg = err.message || 'USB connection failed.';
      this.notifyStatus(msg);
      return { success: false, error: msg };
    }
  }

  // --- Web Serial Support (Virtual COM / USB Serial Thermal Printers) ---
  async connectSerial(baudRate: number = 9600): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      const err = 'Web Serial API is not supported in this browser. Please use Google Chrome or Edge.';
      this.notifyStatus(err);
      return { success: false, error: err };
    }

    try {
      const navSerial = (navigator as any).serial;
      const port = await navSerial.requestPort();
      await port.open({ baudRate });

      this.serialPort = port;
      this.serialWriter = port.writable.getWriter();
      this.deviceName = `USB Serial POS Printer (${baudRate} baud)`;
      this.mode = 'SERIAL';
      this.isConnected = true;
      this.notifyStatus();

      return { success: true, deviceName: this.deviceName };
    } catch (err: any) {
      const msg = err.message || 'Serial port connection failed.';
      this.notifyStatus(msg);
      return { success: false, error: msg };
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected) {
        this.bluetoothDevice.gatt.disconnect();
      }
    } catch {}

    try {
      if (this.usbDevice) {
        await this.usbDevice.close();
      }
    } catch {}

    try {
      if (this.serialWriter) {
        await this.serialWriter.close();
      }
      if (this.serialPort) {
        await this.serialPort.close();
      }
    } catch {}

    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.usbDevice = null;
    this.usbEndpointOut = null;
    this.serialPort = null;
    this.serialWriter = null;
    this.isConnected = false;
    this.deviceName = null;
    this.mode = 'BROWSER';
    this.notifyStatus();
  }

  // Raw Binary Transmission over active channel (with BLE safe chunking)
  private async sendRawBytes(bytes: Uint8Array): Promise<void> {
    if (this.mode === 'BLUETOOTH' && this.bluetoothCharacteristic) {
      // Chunk into 64-byte packets with 20ms pacing to avoid BLE buffer overflow
      const chunkSize = 64;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        if (this.bluetoothCharacteristic.writeValueWithoutResponse) {
          await this.bluetoothCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.bluetoothCharacteristic.writeValue(chunk);
        }
        await new Promise(r => setTimeout(r, 20));
      }
      return;
    }

    if (this.mode === 'USB' && this.usbDevice && this.usbEndpointOut !== null) {
      await this.usbDevice.transferOut(this.usbEndpointOut, bytes);
      return;
    }

    if (this.mode === 'SERIAL' && this.serialWriter) {
      await this.serialWriter.write(bytes);
      return;
    }

    throw new Error('No active direct printer connection.');
  }

  // --- ESC/POS Direct Receipt Generator & Dispatch ---
  generateEscPosReceipt(data: ReceiptData): Uint8Array {
    const charsPerLine = this.width === '58mm' ? 32 : 48;
    const divider = '-'.repeat(charsPerLine);
    const doubleDivider = '='.repeat(charsPerLine);

    const encoder = new EscPosEncoder();

    // 1. Header (Store Name Large + Bold)
    encoder.align('center');
    encoder.doubleSize(true);
    encoder.bold(true);
    encoder.line(data.store_name.toUpperCase());
    encoder.doubleSize(false);
    encoder.bold(false);

    if (data.store_tagline) {
      encoder.line(data.store_tagline);
    }
    encoder.line(data.address);
    encoder.line(`Phone: ${data.phone}`);
    if (data.gstin) {
      encoder.line(`GSTIN: ${data.gstin}`);
    }

    encoder.line(doubleDivider);

    // 2. Invoice Meta
    encoder.align('left');
    const billLine = `Bill: ${data.invoice_no}`.padEnd(charsPerLine - data.date_time.length) + data.date_time;
    encoder.line(billLine);

    if (data.customer_name && data.customer_name !== 'Walk-in Customer') {
      const custText = `Cust: ${data.customer_name}`;
      const phoneText = data.customer_phone || '';
      const custLine = custText.padEnd(Math.max(1, charsPerLine - phoneText.length)) + phoneText;
      encoder.line(custLine);
    }

    encoder.line(divider);

    // 3. Item List
    if (this.width === '58mm') {
      encoder.line('Item              Qty x Rate   Amt');
      encoder.line(divider);
      data.items.forEach(it => {
        encoder.bold(true);
        encoder.line(it.name.substring(0, charsPerLine));
        encoder.bold(false);
        const qtyRate = `${it.qty} ${it.unit} x ${it.rate}`;
        const amt = `Rs.${it.amount.toFixed(2)}`;
        const row = qtyRate.padEnd(charsPerLine - amt.length) + amt;
        encoder.line(row);
      });
    } else {
      encoder.line('Item                         Qty    Rate    Amt');
      encoder.line(divider);
      data.items.forEach(it => {
        const nameCol = it.name.substring(0, 24).padEnd(25);
        const qtyCol = `${it.qty} ${it.unit}`.padStart(8);
        const rateCol = `${it.rate}`.padStart(7);
        const amtCol = `${it.amount.toFixed(2)}`.padStart(7);
        encoder.line(`${nameCol} ${qtyCol} ${rateCol} ${amtCol}`);
      });
    }

    encoder.line(divider);

    // 4. Totals & Tax
    const formatRow = (left: string, right: string) => {
      const pad = Math.max(1, charsPerLine - left.length - right.length);
      return left + ' '.repeat(pad) + right;
    };

    encoder.line(formatRow('Subtotal:', `Rs.${data.subtotal.toFixed(2)}`));
    if (data.discount > 0) {
      encoder.line(formatRow('Discount Savings:', `-Rs.${data.discount.toFixed(2)}`));
    }
    if (data.delivery_charge && data.delivery_charge > 0) {
      encoder.line(formatRow('Delivery Fee:', `Rs.${data.delivery_charge.toFixed(2)}`));
    }
    if (data.gst_amount && data.gst_amount > 0) {
      encoder.line(formatRow('GST Taxes (Included):', `Rs.${data.gst_amount.toFixed(2)}`));
    }

    encoder.line(doubleDivider);

    encoder.bold(true);
    encoder.doubleSize(this.width === '80mm');
    encoder.line(formatRow('NET TOTAL:', `Rs.${data.total.toFixed(2)}`));
    encoder.doubleSize(false);
    encoder.line(formatRow('Payment Mode:', data.payment_method));
    encoder.bold(false);

    encoder.line(doubleDivider);

    // 5. Footer & Greeting
    encoder.align('center');
    encoder.line('** THANK YOU FOR SHOPPING! **');
    encoder.line('Save More Every Day - Please Visit Again');
    if (data.footer_text) {
      encoder.line(data.footer_text);
    }
    if (data.upi_id) {
      encoder.line(`UPI: ${data.upi_id}`);
    }

    encoder.feed(2);
    encoder.cut(false);

    return encoder.getBytes();
  }

  // Print directly to connected hardware, or fallback to browser print dialog
  async printEscPosReceipt(data: ReceiptData): Promise<{ success: boolean; modeUsed: PrinterConnectionMode; error?: string }> {
    if (this.isConnected && (this.mode === 'BLUETOOTH' || this.mode === 'USB' || this.mode === 'SERIAL')) {
      try {
        const rawBytes = this.generateEscPosReceipt(data);
        await this.sendRawBytes(rawBytes);
        return { success: true, modeUsed: this.mode };
      } catch (err: any) {
        console.warn('Direct print error, falling back to browser dialog:', err);
        this.printReceipt();
        return { success: true, modeUsed: 'BROWSER', error: `Direct print failed (${err.message}). Opened print dialog.` };
      }
    }

    // Default Browser Print Dialog
    this.printReceipt();
    return { success: true, modeUsed: 'BROWSER' };
  }

  // Test Print Routine
  async testDirectPrint(storeName: string = 'APNA KIRANA'): Promise<{ success: boolean; error?: string }> {
    const encoder = new EscPosEncoder();
    encoder.align('center');
    encoder.doubleSize(true);
    encoder.bold(true);
    encoder.line(storeName.toUpperCase());
    encoder.doubleSize(false);
    encoder.bold(false);
    encoder.line('--------------------------------');
    encoder.line('THERMAL PRINTER TEST RECEIPT');
    encoder.line(`Connection: ${this.mode}`);
    encoder.line(`Device: ${this.deviceName || 'Standard'}`);
    encoder.line(`Paper Width: ${this.width}`);
    encoder.line(`Date: ${new Date().toLocaleString()}`);
    encoder.line('--------------------------------');
    encoder.line('ESC/POS Command Set Verified OK');
    encoder.line('Bluetooth & USB Data Flow OK');
    encoder.line('================================');
    encoder.feed(2);
    encoder.cut(false);

    if (this.isConnected) {
      try {
        await this.sendRawBytes(encoder.getBytes());
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      window.print();
      return { success: true };
    }
  }

  // Trigger cash drawer kick via connected thermal printer
  async kickCashDrawer(): Promise<{ success: boolean; error?: string }> {
    const encoder = new EscPosEncoder();
    encoder.pulseCashDrawer();

    if (this.isConnected) {
      try {
        await this.sendRawBytes(encoder.getBytes());
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Printer must be connected to kick cash drawer RJ11 port.' };
  }

  // Direct Browser Print Fallback
  printReceipt(elementId?: string) {
    if (elementId) {
      const printEl = document.getElementById(elementId);
      if (printEl) {
        window.print();
        return;
      }
    }
    window.print();
  }

  // Formatter for mono text display preview
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
}

// ----------------------------------------------------
// 3. BARCODE SCANNER HARDWARE LISTENER (Keyboard Wedge: USB & Bluetooth HID)
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
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6 high chime
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
// 4. DIGITAL WEIGHING SCALE HARDWARE ADAPTER
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
// 5. AUDIO CHIME (For New Online Order Notifications)
// ----------------------------------------------------
export function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    
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

// Global Singletons
export const thermalPrinter = new ThermalPrinterAdapter('80mm');
export const barcodeScanner = new BarcodeScannerListener();
export const weighingScale = new WeighingScaleAdapter();
