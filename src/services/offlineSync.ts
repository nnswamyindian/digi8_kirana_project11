// Offline Transaction Synchronization & Resilience Engine for POS Terminal

const CACHE_KEY_PRODUCTS = 'kirana_offline_products';
const QUEUE_KEY_ORDERS = 'kirana_offline_orders_queue';

export interface OfflineOrder {
  local_id: string;
  order_number: string;
  invoice_number: string;
  payload: any;
  created_at: string;
  sync_attempts?: number;
  last_error?: string;
}

type SyncStatusListener = (isOnline: boolean, queuedCount: number) => void;

class OfflineSyncManager {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<SyncStatusListener> = new Set();
  private isSyncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.notifyListeners();
        this.autoSync();
      });

      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.notifyListeners();
      });
    }
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnlineStatus, this.getQueuedOrders().length);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const count = this.getQueuedOrders().length;
    this.listeners.forEach(fn => {
      try {
        fn(this.isOnlineStatus, count);
      } catch (e) {
        console.error('[OfflineSync notify error]:', e);
      }
    });
  }

  // Cache products locally for offline lookup & scanning
  public cacheProducts(products: any[]) {
    try {
      if (Array.isArray(products) && products.length > 0) {
        localStorage.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(products));
      }
    } catch (e) {
      console.warn('Failed to cache products locally:', e);
    }
  }

  public getCachedProducts(): any[] {
    try {
      const data = localStorage.getItem(CACHE_KEY_PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Save an order in the offline queue if network is down or request fails
  public enqueueOrder(payload: any): OfflineOrder {
    const queue = this.getQueuedOrders();
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNum = 'OFFLINE-' + randSuffix;
    const invNum = 'OFF-INV-' + randSuffix;

    const item: OfflineOrder = {
      local_id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      order_number: orderNum,
      invoice_number: invNum,
      payload: {
        ...payload,
        is_offline_order: true,
        offline_order_number: orderNum,
        offline_invoice_number: invNum,
        offline_timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      sync_attempts: 0
    };

    queue.push(item);
    try {
      localStorage.setItem(QUEUE_KEY_ORDERS, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to store offline order in localStorage:', e);
    }

    this.notifyListeners();
    return item;
  }

  public getQueuedOrders(): OfflineOrder[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY_ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public clearQueuedOrders() {
    localStorage.removeItem(QUEUE_KEY_ORDERS);
    this.notifyListeners();
  }

  public removeQueuedOrder(localId: string) {
    const queue = this.getQueuedOrders().filter(it => it.local_id !== localId);
    localStorage.setItem(QUEUE_KEY_ORDERS, JSON.stringify(queue));
    this.notifyListeners();
  }

  // Trigger sync of all pending orders
  public async syncPendingOrders(
    submitFn: (payload: any) => Promise<any>
  ): Promise<{ syncedCount: number; errors: any[] }> {
    if (this.isSyncing) {
      return { syncedCount: 0, errors: [{ message: 'Sync already in progress' }] };
    }

    const queue = this.getQueuedOrders();
    if (queue.length === 0) return { syncedCount: 0, errors: [] };

    this.isSyncing = true;
    let syncedCount = 0;
    const remaining: OfflineOrder[] = [];
    const errors: any[] = [];

    for (const item of queue) {
      try {
        await submitFn(item.payload);
        syncedCount++;
      } catch (err: any) {
        console.warn(`[OfflineSync] Order ${item.local_id} failed to sync:`, err.message || err);
        errors.push({ id: item.local_id, error: err.message || err });
        remaining.push({
          ...item,
          sync_attempts: (item.sync_attempts || 0) + 1,
          last_error: err.message || String(err)
        });
      }
    }

    localStorage.setItem(QUEUE_KEY_ORDERS, JSON.stringify(remaining));
    this.isSyncing = false;
    this.notifyListeners();
    return { syncedCount, errors };
  }

  private autoSyncHandler: ((submitFn: (payload: any) => Promise<any>) => void) | null = null;

  public setAutoSyncSubmitter(submitFn: (payload: any) => Promise<any>) {
    this.autoSyncHandler = (fn) => {
      this.syncPendingOrders(fn).catch(console.error);
    };
    this.submitFnRef = submitFn;
  }

  private submitFnRef: ((payload: any) => Promise<any>) | null = null;

  private autoSync() {
    if (this.submitFnRef && this.getQueuedOrders().length > 0) {
      console.log('[OfflineSync] Connection restored. Auto-syncing pending orders...');
      this.syncPendingOrders(this.submitFnRef).then(res => {
        if (res.syncedCount > 0) {
          console.log(`[OfflineSync] Auto-synced ${res.syncedCount} offline orders.`);
        }
      }).catch(console.error);
    }
  }
}

export const offlineSync = new OfflineSyncManager();
