// Centralized Business Calculation & Validation Utilities

import { DiscountType, POSOrderItemDetail, SaaSUserRole } from '../types';
import { DISCOUNT_LIMITS } from '../constants';

/**
 * Validates tenant slug (subdomain safe: lowercase alphanumeric and hyphens, 3-30 chars)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug);
}

/**
 * Normalizes store name into a clean URL-friendly slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
}

/**
 * Server-Authoritative calculation for POS Order Item line amounts
 */
export function calculateLineItemAmounts(params: {
  quantity: number;
  unit_price: number;
  discount_type?: DiscountType;
  discount_value?: number;
  gst_percent?: number;
}) {
  const qty = Math.max(0.001, Number(params.quantity) || 1);
  const unitPrice = Math.max(0, Number(params.unit_price) || 0);
  const grossAmount = Math.round(qty * unitPrice * 100) / 100;

  const dType = params.discount_type || 'NONE';
  const dVal = Math.max(0, Number(params.discount_value) || 0);

  let discountAmount = 0;
  if (dType === 'PERCENT') {
    const cappedPercent = Math.min(100, dVal);
    discountAmount = Math.round(((grossAmount * cappedPercent) / 100) * 100) / 100;
  } else if (dType === 'FIXED') {
    discountAmount = Math.min(grossAmount, Math.round(dVal * 100) / 100);
  }

  const taxableAmount = Math.max(0, Math.round((grossAmount - discountAmount) * 100) / 100);
  const gstRate = Math.max(0, Number(params.gst_percent) || 0);
  const taxAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
  const finalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return {
    quantity: qty,
    unit_price: unitPrice,
    gross_amount: grossAmount,
    discount_type: dType,
    discount_value: dVal,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    gst_percent: gstRate,
    tax_amount: taxAmount,
    final_amount: finalAmount,
  };
}

/**
 * Checks if a requested discount percentage requires higher role approval
 */
export function checkDiscountApprovalRequired(params: {
  discount_percent: number;
  user_role: string;
}): { requires_approval: boolean; max_allowed_percent: number; approver_role_required: string } {
  const role = (params.user_role || '').toUpperCase();
  const requestedPercent = Number(params.discount_percent) || 0;

  if (role === 'OWNER' || role === 'STORE_OWNER' || role === 'PLATFORM_ADMIN') {
    return { requires_approval: false, max_allowed_percent: 100, approver_role_required: 'NONE' };
  }

  if (role === 'MANAGER' || role === 'SUB_ADMIN' || role === 'STORE_ADMIN') {
    if (requestedPercent <= DISCOUNT_LIMITS.MANAGER_MAX_PERCENT) {
      return { requires_approval: false, max_allowed_percent: DISCOUNT_LIMITS.MANAGER_MAX_PERCENT, approver_role_required: 'NONE' };
    }
    return { requires_approval: true, max_allowed_percent: DISCOUNT_LIMITS.MANAGER_MAX_PERCENT, approver_role_required: 'STORE_OWNER' };
  }

  // Cashier or others
  if (requestedPercent <= DISCOUNT_LIMITS.CASHIER_MAX_PERCENT) {
    return { requires_approval: false, max_allowed_percent: DISCOUNT_LIMITS.CASHIER_MAX_PERCENT, approver_role_required: 'NONE' };
  }

  return {
    requires_approval: true,
    max_allowed_percent: DISCOUNT_LIMITS.CASHIER_MAX_PERCENT,
    approver_role_required: requestedPercent <= DISCOUNT_LIMITS.MANAGER_MAX_PERCENT ? 'MANAGER' : 'STORE_OWNER',
  };
}
