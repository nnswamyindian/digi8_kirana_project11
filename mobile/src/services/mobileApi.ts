/**
 * Mobile API Client for Kirana SaaS Platform
 * Supports Multi-Tenant Resolution, Secure Storage, and Offline Handover Queueing
 */

const BASE_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

class MobileApiClient {
  private activeTenantId: string = 'store_royal_001';
  private authToken: string | null = null;
  private offlineQueue: Array<{ url: string; options: any; timestamp: number }> = [];

  constructor() {
    this.initStorage();
  }

  private async initStorage() {
    try {
      // In production React Native, use *as SecureStore from 'expo-secure-store'*
      // Fallback safely for Node / mock execution
      if (typeof window !== 'undefined' && window.localStorage) {
        this.activeTenantId = window.localStorage.getItem('mobile_active_tenant_id') || 'store_royal_001';
        this.authToken = window.localStorage.getItem('mobile_auth_token');
      }
    } catch {}
  }

  public setTenantId(tenantId: string) {
    this.activeTenantId = tenantId;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mobile_active_tenant_id', tenantId);
      }
    } catch {}
  }

  public getTenantId(): string {
    return this.activeTenantId;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
    try {
      if (token && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mobile_auth_token', token);
      }
    } catch {}
  }

  public async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': this.activeTenantId,
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const fullUrl = `${BASE_API_URL}${endpoint}`;

    try {
      const res = await fetch(fullUrl, { ...options, headers });
      return res;
    } catch (networkErr) {
      // Enqueue offline action if it is a mutation (e.g. cash collection or delivery finish)
      if (options.method && ['POST', 'PUT'].includes(options.method.toUpperCase())) {
        this.offlineQueue.push({
          url: fullUrl,
          options,
          timestamp: Date.now()
        });
      }
      throw networkErr;
    }
  }

  // Tenant & Catalog APIs
  public async getStoreProfile() {
    const res = await this.fetch('/store');
    return res.json();
  }

  public async getProducts(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await this.fetch(`/products?${qs}`);
    return res.json();
  }

  public async getCategories() {
    const res = await this.fetch('/categories');
    return res.json();
  }

  public async createOrder(orderPayload: any) {
    const res = await this.fetch('/orders/online', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
    return res.json();
  }

  public async getTrackingDetails(orderId: string) {
    const res = await this.fetch(`/delivery-tracking/${orderId}`);
    return res.json();
  }

  // Delivery Agent Specific APIs
  public async getRiderOrders(riderId: string) {
    const res = await this.fetch(`/orders/delivery-boy/${riderId}`);
    return res.json();
  }

  public async updateRiderLocation(locationPayload: {
    delivery_boy_id: string;
    order_id?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  }) {
    const res = await this.fetch('/delivery-tracking/location', {
      method: 'POST',
      body: JSON.stringify(locationPayload)
    });
    return res.json();
  }

  public async recordCashCollection(orderId: string, payload: {
    collected_amount: number;
    payment_mode: 'CASH' | 'UPI_QR';
    notes?: string;
  }) {
    const res = await this.fetch(`/orders/${orderId}/cash-collection`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  public async completeDelivery(orderId: string, otp?: string) {
    const res = await this.fetch(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'DELIVERED', otp })
    });
    return res.json();
  }
}

export const mobileApi = new MobileApiClient();
