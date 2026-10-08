import { getOne, query, execute } from '../db.js';

/**
 * Normalizes barcode input from USB, Bluetooth, Camera, or manual entry:
 * - Trims whitespace
 * - Strips CR, LF, TAB and non-printable control characters
 * - Preserves leading zeros (returns clean string, never numeric)
 */
export function normalizeBarcode(raw) {
  if (!raw) return '';
  return String(raw)
    .trim()
    .replace(/[\r\n\t\x00-\x1F\x7F]/g, '');
}

/**
 * Weighted Barcode Parser
 * Retail Supermarkets & Kirana stores use GS1 / EAN-13 in-store price-computing scales.
 * Standard format:
 * Prefix (2 digits, e.g. 20-29 or 02) + Item Code (4-5 digits) + Weight/Price (5 digits in grams/paise) + Check digit (1 digit)
 * Example: '2001234023508'
 *   - Prefix: '20'
 *   - Item Code: '01234'
 *   - Weight: '02350' (2350g = 2.350 KG)
 */
export function parseWeightedBarcode(barcode, config = {}) {
  const clean = normalizeBarcode(barcode);
  const prefixes = (config.prefixes || '20,21,22,23,24,25,26,27,28,29,02')
    .split(',')
    .map(p => p.trim());

  if (clean.length !== 12 && clean.length !== 13) {
    return { isWeighted: false };
  }

  const prefix = clean.substring(0, 2);
  if (!prefixes.includes(prefix)) {
    return { isWeighted: false };
  }

  // Standard EAN-13 weighted format: PP (2) + IIII (4) or IIIII (5) + WWWWW (5) + C (1)
  // Most retail scales in India use 5-digit item code + 5-digit weight in grams
  const itemCode = clean.substring(2, 7);
  const weightGrams = parseInt(clean.substring(7, 12), 10);

  if (isNaN(weightGrams) || weightGrams <= 0) {
    return { isWeighted: false };
  }

  const weightKg = Math.round((weightGrams / 1000) * 1000) / 1000;

  return {
    isWeighted: true,
    prefix,
    itemCode,
    weightKg,
    rawWeightGrams: weightGrams,
    checkDigit: clean.slice(-1)
  };
}

/**
 * Level 2: Digi8 Global Catalog Provider
 */
export class Digi8GlobalCatalogProvider {
  async lookup(barcode) {
    try {
      const clean = normalizeBarcode(barcode);
      const row = await getOne(
        'SELECT * FROM global_product_catalog WHERE barcode = ? LIMIT 1',
        [clean]
      );
      if (row) {
        return {
          found: true,
          source: 'global_catalog',
          product: {
            id: row.id,
            barcode: row.barcode,
            name: row.name,
            brand: row.brand || '',
            category: row.category || 'Grocery',
            subcategory: row.subcategory || '',
            unit: row.unit || 'PACKET',
            pack_size: row.pack_size || '',
            mrp: Number(row.mrp) || 0,
            hsn_code: row.hsn_code || '',
            manufacturer: row.manufacturer || '',
            photo_url: row.image_url || '',
            description: row.description || '',
            source: 'global_catalog'
          }
        };
      }
      return { found: false };
    } catch (err) {
      console.warn('[Global Catalog Provider Error]:', err.message);
      return { found: false };
    }
  }
}

/**
 * Level 3: External Barcode Product Provider (OpenFoodFacts with timeout & fallback)
 */
export class ExternalProductProvider {
  async lookup(barcode) {
    const clean = normalizeBarcode(barcode);
    if (!/^\d{8,14}$/.test(clean)) {
      return { found: false };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s strict timeout

      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(clean)}.json`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Digi8Kirana-POS/1.0 (retail-pos@digi8.in)'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) return { found: false };
      const data = await res.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name || p.product_name_en || p.generic_name || 'Packaged Grocery Item';
        const brand = p.brands || p.brand_owner || '';
        const pack = p.quantity || p.net_weight || '';
        const img = p.image_front_url || p.image_url || '';
        const category = p.categories_tags?.[0]?.replace(/^en:/, '').replace(/-/g, ' ') || 'Grocery';

        return {
          found: true,
          source: 'external_provider',
          product: {
            barcode: clean,
            name: brand ? `${brand} ${name}` : name,
            brand: brand,
            category: category,
            subcategory: p.categories_tags?.[1]?.replace(/^en:/, '').replace(/-/g, ' ') || '',
            pack_size: pack,
            unit: pack.toLowerCase().includes('kg') ? 'KG' : (pack.toLowerCase().includes('l') ? 'LITRE' : 'PACKET'),
            mrp: 0, // External APIs do not guarantee store price
            photo_url: img,
            description: p.ingredients_text || '',
            manufacturer: p.manufacturing_places || '',
            source: 'external_provider'
          }
        };
      }
      return { found: false };
    } catch (err) {
      // Gracefully catch timeout or external API errors without failing POS
      return { found: false };
    }
  }
}

/**
 * Helper to log barcode audit events
 */
export async function logBarcodeAudit(tenantId, storeId, action, entityId, details, userName = 'POS Scanner') {
  try {
    const now = new Date().toISOString();
    await execute(`
      INSERT INTO audit_logs (id, store_id, tenant_id, action, entity_type, entity_id, details, user_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'aud_bc_' + Math.random().toString(36).substring(2, 9),
      storeId || tenantId || 'store_royal_001',
      tenantId || 'store_royal_001',
      action,
      'BARCODE',
      entityId || null,
      typeof details === 'object' ? JSON.stringify(details) : String(details),
      userName,
      now
    ]);
  } catch (err) {
    console.warn('[Audit Log Error]:', err.message);
  }
}

/**
 * Composite Intelligent Barcode Lookup Service
 * Evaluates:
 * 1. Weighted Barcode Detection
 * 2. Current Tenant Catalog (Authoritative Store Price & Stock)
 * 3. Digi8 Global Catalog
 * 4. External Barcode Provider
 */
export class BarcodeLookupService {
  constructor() {
    this.globalProvider = new Digi8GlobalCatalogProvider();
    this.externalProvider = new ExternalProductProvider();
  }

  async lookup(rawBarcode, tenantId, user = null) {
    const clean = normalizeBarcode(rawBarcode);
    if (!clean) {
      return { found: false, error: 'INVALID_BARCODE', message: 'Barcode is empty or invalid' };
    }

    const effectiveTenant = tenantId || 'store_royal_001';
    await logBarcodeAudit(effectiveTenant, effectiveTenant, 'BARCODE_SCANNED', clean, { barcode: clean }, user?.name);

    // 1. Check if Weighted Barcode
    const weighted = parseWeightedBarcode(clean);
    if (weighted.isWeighted) {
      // Find matching loose product in store catalog by itemCode or prefix
      const looseProduct = await getOne(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE (p.tenant_id = ? OR p.store_id = ?)
          AND (p.barcode = ? OR p.sku = ? OR p.barcode LIKE ? OR p.barcode LIKE ?)
        LIMIT 1
      `, [
        effectiveTenant,
        effectiveTenant,
        weighted.itemCode,
        weighted.itemCode,
        `${weighted.prefix}${weighted.itemCode}%`,
        `%${weighted.itemCode}%`
      ]);

      if (looseProduct) {
        const ratePerKg = Number(looseProduct.selling_price) || 0;
        const computedAmount = Math.round(ratePerKg * weighted.weightKg * 100) / 100;

        await logBarcodeAudit(
          effectiveTenant,
          effectiveTenant,
          'WEIGHT_BARCODE_PARSED',
          looseProduct.id,
          { barcode: clean, itemCode: weighted.itemCode, weightKg: weighted.weightKg, computedAmount },
          user?.name
        );

        return {
          found: true,
          source: 'tenant_catalog',
          is_weighted_barcode: true,
          parsed_weight: weighted.weightKg,
          calculated_amount: computedAmount,
          product: {
            ...looseProduct,
            stock: Number(looseProduct.stock) || 0,
            available_stock: Math.max(0, (Number(looseProduct.stock) || 0) - (looseProduct.reserved_stock || 0)),
            is_in_stock: (Number(looseProduct.stock) || 0) > 0,
            stock_status: (Number(looseProduct.stock) || 0) <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK'
          }
        };
      }
    }

    // 2. LEVEL 1: Look up in Current Tenant Store Catalog
    const tenantProduct = await getOne(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.tenant_id = ? OR p.store_id = ?)
        AND (p.barcode = ? OR p.sku = ?)
      LIMIT 1
    `, [effectiveTenant, effectiveTenant, clean, clean]);

    if (tenantProduct) {
      const stock = Number(tenantProduct.stock) || 0;
      const minStock = Number(tenantProduct.min_stock) || 5;
      const stockStatus = stock <= 0 ? 'OUT_OF_STOCK' : (stock <= minStock ? 'LOW_STOCK' : 'IN_STOCK');

      await logBarcodeAudit(
        effectiveTenant,
        effectiveTenant,
        'BARCODE_PRODUCT_FOUND',
        tenantProduct.id,
        { barcode: clean, product_name: tenantProduct.name, price: tenantProduct.selling_price },
        user?.name
      );

      return {
        found: true,
        source: 'tenant_catalog',
        is_weighted_barcode: false,
        product: {
          ...tenantProduct,
          available_stock: Math.max(0, stock - (tenantProduct.reserved_stock || 0)),
          is_in_stock: stock > 0,
          stock_status: stockStatus,
          selling_price: Number(tenantProduct.selling_price) || 0,
          mrp: Number(tenantProduct.mrp) || Number(tenantProduct.selling_price) || 0,
          purchase_cost: Number(tenantProduct.purchase_cost) || 0
        }
      };
    }

    // 3. LEVEL 2: Look up in Digi8 Global Product Database
    const globalRes = await this.globalProvider.lookup(clean);
    if (globalRes.found) {
      await logBarcodeAudit(
        effectiveTenant,
        effectiveTenant,
        'GLOBAL_PRODUCT_FOUND',
        clean,
        { barcode: clean, product_name: globalRes.product.name },
        user?.name
      );

      return {
        found: true,
        source: 'global_catalog',
        is_weighted_barcode: false,
        global_product: globalRes.product
      };
    }

    // 4. LEVEL 3: Query External Barcode Provider
    const externalRes = await this.externalProvider.lookup(clean);
    if (externalRes.found) {
      await logBarcodeAudit(
        effectiveTenant,
        effectiveTenant,
        'EXTERNAL_PRODUCT_FOUND',
        clean,
        { barcode: clean, product_name: externalRes.product.name },
        user?.name
      );

      return {
        found: true,
        source: 'external_provider',
        is_weighted_barcode: false,
        global_product: externalRes.product
      };
    }

    // 5. Product Not Found in any catalog
    await logBarcodeAudit(
      effectiveTenant,
      effectiveTenant,
      'BARCODE_PRODUCT_NOT_FOUND',
      clean,
      { barcode: clean },
      user?.name
    );

    return {
      found: false,
      source: 'none',
      barcode: clean,
      message: `Product with barcode "${clean}" not found in store or global database.`
    };
  }
}

export const barcodeService = new BarcodeLookupService();
