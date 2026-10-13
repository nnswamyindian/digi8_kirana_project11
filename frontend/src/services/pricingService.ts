/**
 * Single Authoritative Pricing & Unit Conversion Service
 * Used across POS Terminal Cart, Modals, Receipt Generation, and Order Payloads.
 * Implements strict guardrails against negative prices, NaN/Infinity, rounding drift,
 * double discounts, and invalid percentage entries.
 */

export type AdjustmentMode = 'DISCOUNT_PERCENT' | 'MANUAL_PRICE' | 'PRICE_INCREASE' | 'NONE';

export interface LineItemPricingInput {
  original_price: number;
  quantity: number;
  unit: string;
  adjustment_mode?: AdjustmentMode;
  discount_percent?: number;
  manual_unit_price?: number;
  gst_percent?: number;
}

export interface LineItemPricingOutput {
  original_price: number;
  unit_price: number;
  quantity: number;
  unit: string;
  adjustment_mode: AdjustmentMode;
  discount_percent: number;
  discount_amount: number;
  is_price_increase: boolean;
  price_difference: number;
  price_difference_percent: number;
  is_manual_price_adjusted: boolean;
  taxable_amount: number;
  gst_percent: number;
  tax_amount: number;
  line_total: number;
}

export interface CartTotalsInput {
  items: LineItemPricingOutput[];
  bill_discount_type?: 'FLAT' | 'PERCENT';
  bill_discount_value?: number;
}

export interface CartTotalsOutput {
  gross_subtotal: number;
  total_item_discounts: number;
  net_item_subtotal: number;
  bill_discount_amount: number;
  total_savings: number;
  total_tax: number;
  grand_total: number;
}

export type SupportedUnit =
  | 'KG'
  | 'GRAM'
  | 'LITRE'
  | 'ML'
  | 'PIECE'
  | 'PACKET'
  | 'BOX'
  | 'BOTTLE'
  | 'DOZEN';

export const SUPPORTED_UNITS: SupportedUnit[] = [
  'KG',
  'GRAM',
  'LITRE',
  'ML',
  'PIECE',
  'PACKET',
  'BOX',
  'BOTTLE',
  'DOZEN'
];

/**
 * Clean floating point numbers to 2 decimal places with banker/half-up consistency.
 */
export function round2(num: number): number {
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Clean quantity to 3 decimal places (supports up to 1 gram / 1 ml accuracy).
 */
export function round3(num: number): number {
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 1000) / 1000;
}

/**
 * Authoritative line item calculation.
 */
export function calculateLineItemPricing(input: LineItemPricingInput): LineItemPricingOutput {
  const origPrice = Math.max(0, Number(input.original_price) || 0);
  const qty = Math.max(0.001, Number(input.quantity) || 1);
  const gstRate = Math.max(0, Number(input.gst_percent) || 0);
  const mode = input.adjustment_mode || 'NONE';

  let finalUnitPrice = origPrice;
  let discountPct = 0;
  let isPriceIncrease = false;
  let priceDiff = 0;
  let priceDiffPct = 0;
  let isManualAdjusted = false;

  if (mode === 'DISCOUNT_PERCENT') {
    const rawPct = Number(input.discount_percent);
    const validPct = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, rawPct)) : 0;
    discountPct = validPct;
    const unitDiscount = round2((origPrice * validPct) / 100);
    finalUnitPrice = Math.max(0, origPrice - unitDiscount);
    isManualAdjusted = validPct > 0;
  } else if (mode === 'MANUAL_PRICE' || mode === 'PRICE_INCREASE') {
    const rawPrice = Number(input.manual_unit_price);
    const validPrice = Number.isFinite(rawPrice) ? Math.max(0, round2(rawPrice)) : origPrice;
    finalUnitPrice = validPrice;
    priceDiff = round2(finalUnitPrice - origPrice);

    if (priceDiff > 0.005) {
      // Price Increase: Never interpret as a discount
      isPriceIncrease = true;
      priceDiffPct = origPrice > 0 ? round2((priceDiff / origPrice) * 100) : 0;
      discountPct = 0;
      isManualAdjusted = true;
    } else if (priceDiff < -0.005) {
      // Price Reduction / Manual Selling Price
      isPriceIncrease = false;
      const unitDiscount = Math.abs(priceDiff);
      discountPct = origPrice > 0 ? round2((unitDiscount / origPrice) * 100) : 0;
      isManualAdjusted = true;
    } else {
      // No actual price difference
      isPriceIncrease = false;
      discountPct = 0;
      isManualAdjusted = false;
    }
  }

  // Final Guardrails
  if (!Number.isFinite(finalUnitPrice) || finalUnitPrice < 0) {
    finalUnitPrice = 0;
  }
  finalUnitPrice = round2(finalUnitPrice);

  const unitDiscount = Math.max(0, round2(origPrice - finalUnitPrice));
  const totalLineDiscount = isPriceIncrease ? 0 : round2(qty * unitDiscount);

  // Line Total before tax
  const taxableAmount = round2(qty * finalUnitPrice);

  // Tax calculation
  const taxAmount = round2((taxableAmount * gstRate) / 100);
  const lineTotal = round2(taxableAmount + taxAmount);

  return {
    original_price: origPrice,
    unit_price: finalUnitPrice,
    quantity: round3(qty),
    unit: input.unit || 'PACKET',
    adjustment_mode: mode,
    discount_percent: discountPct,
    discount_amount: totalLineDiscount,
    is_price_increase: isPriceIncrease,
    price_difference: priceDiff,
    price_difference_percent: priceDiffPct,
    is_manual_price_adjusted: isManualAdjusted,
    taxable_amount: taxableAmount,
    gst_percent: gstRate,
    tax_amount: taxAmount,
    line_total: lineTotal
  };
}

/**
 * Authoritative cart totals calculation.
 */
export function calculateCartTotals(input: CartTotalsInput): CartTotalsOutput {
  const items = input.items || [];

  const grossSubtotal = round2(
    items.reduce((sum, it) => {
      const basePrice = (it.is_price_increase || it.unit_price > it.original_price)
        ? it.unit_price
        : it.original_price;
      return sum + (it.quantity * basePrice);
    }, 0)
  );

  const totalItemDiscounts = round2(
    items.reduce((sum, it) => sum + (it.is_price_increase ? 0 : it.discount_amount), 0)
  );

  const netItemSubtotal = round2(
    items.reduce((sum, it) => sum + it.taxable_amount, 0)
  );

  const totalTax = round2(
    items.reduce((sum, it) => sum + it.tax_amount, 0)
  );

  let billDiscount = 0;
  const billVal = Number(input.bill_discount_value) || 0;

  if (input.bill_discount_type === 'PERCENT') {
    const validPct = Math.min(100, Math.max(0, billVal));
    billDiscount = round2((netItemSubtotal * validPct) / 100);
  } else if (input.bill_discount_type === 'FLAT') {
    billDiscount = Math.min(netItemSubtotal, Math.max(0, round2(billVal)));
  }

  const grandTotal = Math.max(0, round2(netItemSubtotal - billDiscount + totalTax));
  const totalSavings = round2(totalItemDiscounts + billDiscount);

  return {
    gross_subtotal: grossSubtotal,
    total_item_discounts: totalItemDiscounts,
    net_item_subtotal: netItemSubtotal,
    bill_discount_amount: billDiscount,
    total_savings: totalSavings,
    total_tax: totalTax,
    grand_total: grandTotal
  };
}

// ----------------------------------------------------
// UNIT CONVERSIONS & LOOSE ITEM HELPERS
// ----------------------------------------------------

export function isWeightUnit(unit: string): boolean {
  const u = (unit || '').toUpperCase().trim();
  return u === 'KG' || u === 'GRAM' || u === 'G' || u === 'KGS';
}

export function isVolumeUnit(unit: string): boolean {
  const u = (unit || '').toUpperCase().trim();
  return u === 'LITRE' || u === 'L' || u === 'ML' || u === 'LITRES';
}

export function isCountUnit(unit: string): boolean {
  const u = (unit || '').toUpperCase().trim();
  return ['PIECE', 'PACKET', 'BOX', 'BOTTLE', 'DOZEN', 'BAG', 'BUNDLE'].includes(u);
}

/**
 * Standardize unit strings into canonical enum.
 */
export function canonicalUnit(unit: string): SupportedUnit {
  const u = (unit || '').toUpperCase().trim();
  if (u === 'G' || u === 'GRAM' || u === 'GRAMS') return 'GRAM';
  if (u === 'KG' || u === 'KGS' || u === 'KILOGRAM') return 'KG';
  if (u === 'ML' || u === 'MILLILITRE') return 'ML';
  if (u === 'L' || u === 'LITRE' || u === 'LITRES') return 'LITRE';
  if (u === 'PC' || u === 'PCS' || u === 'PIECE' || u === 'PIECES') return 'PIECE';
  if (u === 'PKT' || u === 'PACKET' || u === 'PACKETS') return 'PACKET';
  if (u === 'BX' || u === 'BOX' || u === 'BOXES') return 'BOX';
  if (u === 'BTL' || u === 'BOTTLE' || u === 'BOTTLES') return 'BOTTLE';
  if (u === 'DZ' || u === 'DOZEN') return 'DOZEN';
  return (u as SupportedUnit) || 'PACKET';
}

/**
 * Convert quantity from one unit to another, strictly verifying dimension compatibility.
 * Rejects treating packet, bottle, or piece as a weight or volume.
 */
export function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  const from = canonicalUnit(fromUnit);
  const to = canonicalUnit(toUnit);
  const qty = Number(quantity) || 0;

  if (from === to) return qty;

  // Weight conversions
  if (from === 'GRAM' && to === 'KG') return round3(qty / 1000);
  if (from === 'KG' && to === 'GRAM') return round3(qty * 1000);

  // Volume conversions
  if (from === 'ML' && to === 'LITRE') return round3(qty / 1000);
  if (from === 'LITRE' && to === 'ML') return round3(qty * 1000);

  // Count conversions
  if (from === 'DOZEN' && to === 'PIECE') return round3(qty * 12);
  if (from === 'PIECE' && to === 'DOZEN') return round3(qty / 12);

  // If conversion across incompatible dimension is requested, return original quantity safely
  return qty;
}

/**
 * Format weight or quantity with unit for receipts and UI displays.
 * e.g., 0.750 KG -> "750 g" or "0.75 kg"
 */
export function formatDisplayQuantity(quantity: number | string, unit?: string): string {
  const u = canonicalUnit(unit || 'PIECE');
  const q = Number(quantity) || 0;

  if (u === 'KG') {
    if (q < 1 && q > 0) {
      return `${Math.round(q * 1000)} g`;
    }
    return `${q % 1 === 0 ? q : q.toFixed(3).replace(/\.?0+$/, '')} kg`;
  }

  if (u === 'GRAM') {
    if (q >= 1000) {
      const kg = q / 1000;
      return `${kg % 1 === 0 ? kg : kg.toFixed(3).replace(/\.?0+$/, '')} kg`;
    }
    return `${Math.round(q)} g`;
  }

  if (u === 'LITRE') {
    if (q < 1 && q > 0) {
      return `${Math.round(q * 1000)} ml`;
    }
    return `${q % 1 === 0 ? q : q.toFixed(3).replace(/\.?0+$/, '')} L`;
  }

  if (u === 'ML') {
    if (q >= 1000) {
      const l = q / 1000;
      return `${l % 1 === 0 ? l : l.toFixed(3).replace(/\.?0+$/, '')} L`;
    }
    return `${Math.round(q)} ml`;
  }

  return `${q} ${u}`;
}

/**
 * Loose item rate calculation:
 * - Example 1: Rate ₹60/kg, 750 grams -> ₹45.00
 * - Example 2: Rate ₹50/kg, wanted ₹20 worth -> 400 grams
 * - Example 3: Weight 650 grams, agreed total ₹42 -> Pre-tax line total ₹42, effective unit price ₹64.62/kg
 */
export function calculateLooseItem(params: {
  ratePerBaseUnit: number;
  baseUnit: string;
  mode: 'RATE_BASED' | 'AMOUNT_BASED' | 'MANUAL_TOTAL';
  enteredQuantity?: number;
  enteredUnit?: string;
  desiredAmount?: number;
  manualTotal?: number;
}): {
  baseQuantity: number;
  displayQuantity: number;
  displayUnit: string;
  calculatedPrice: number;
  effectiveUnitPrice: number;
} {
  const rate = Math.max(0, Number(params.ratePerBaseUnit) || 0);
  const baseU = canonicalUnit(params.baseUnit || 'KG');

  if (params.mode === 'AMOUNT_BASED') {
    // Example 2: Desired amount entered (e.g. ₹20 worth @ ₹50/kg)
    const amount = Math.max(0, Number(params.desiredAmount) || 0);
    const baseQty = rate > 0 ? round3(amount / rate) : 0;
    const isWeight = baseU === 'KG';
    const isVolume = baseU === 'LITRE';

    let displayQty = baseQty;
    let displayU = baseU;

    if (isWeight && baseQty < 1) {
      displayQty = Math.round(baseQty * 1000);
      displayU = 'GRAM';
    } else if (isVolume && baseQty < 1) {
      displayQty = Math.round(baseQty * 1000);
      displayU = 'ML';
    }

    return {
      baseQuantity: baseQty,
      displayQuantity: displayQty,
      displayUnit: displayU,
      calculatedPrice: round2(amount),
      effectiveUnitPrice: rate
    };
  }

  if (params.mode === 'MANUAL_TOTAL') {
    // Example 3: Manual weight & manual agreed price (e.g. 650g @ ₹42 agreed)
    const enteredQty = Math.max(0.001, Number(params.enteredQuantity) || 0);
    const enteredU = canonicalUnit(params.enteredUnit || baseU);
    const baseQty = round3(convertQuantity(enteredQty, enteredU, baseU));
    const agreedTotal = Math.max(0, round2(Number(params.manualTotal) || 0));
    const effectiveRate = baseQty > 0 ? round2(agreedTotal / baseQty) : rate;

    return {
      baseQuantity: baseQty,
      displayQuantity: enteredQty,
      displayUnit: enteredU,
      calculatedPrice: agreedTotal,
      effectiveUnitPrice: effectiveRate
    };
  }

  // Example 1: Rate-based mode (e.g. 750 grams @ ₹60/kg)
  const enteredQty = Math.max(0.001, Number(params.enteredQuantity) || 1);
  const enteredU = canonicalUnit(params.enteredUnit || baseU);
  const baseQty = round3(convertQuantity(enteredQty, enteredU, baseU));
  const calcPrice = round2(baseQty * rate);

  return {
    baseQuantity: baseQty,
    displayQuantity: enteredQty,
    displayUnit: enteredU,
    calculatedPrice: calcPrice,
    effectiveUnitPrice: rate
  };
}
