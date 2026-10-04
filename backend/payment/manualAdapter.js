/**
 * Manual & Cash Payment Adapter
 * Handles doorstep cash collection, POS counter cash, change calculations,
 * and doorstep audit trails.
 */
export class ManualPaymentAdapter {
  /**
   * Calculate change to return to customer
   */
  calculateChange(orderTotal, customerTendered) {
    const total = Number(orderTotal);
    const tendered = Number(customerTendered);
    if (isNaN(tendered) || tendered < total) {
      throw new Error(`Customer tendered amount (₹${tendered}) cannot be less than order total (₹${total})`);
    }
    const change = Math.round((tendered - total) * 100) / 100;
    return {
      order_total: total,
      customer_tendered: tendered,
      change_due: change
    };
  }

  /**
   * Format cash collection audit record
   */
  prepareCollectionAudit({
    orderId,
    agentId,
    agentName,
    orderTotal,
    amountCollected,
    customerTendered,
    changeReturned,
    latitude,
    longitude,
    deviceInfo,
    notes
  }) {
    return {
      order_id: orderId,
      agent_id: agentId,
      agent_name: agentName,
      order_total: Number(orderTotal),
      amount_collected: Number(amountCollected),
      customer_tendered: Number(customerTendered),
      change_returned: Number(changeReturned || 0),
      currency: 'INR',
      payment_method: 'CASH',
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      device_info: deviceInfo ? JSON.stringify(deviceInfo) : null,
      notes: notes || 'Doorstep cash collected'
    };
  }
}

export const manualPaymentAdapter = new ManualPaymentAdapter();
