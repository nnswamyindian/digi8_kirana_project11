import { query, getOne, execute } from '../db.js';

/**
 * Notification Service
 * Centralized in-app and real-time notification engine for Owner, Staff, and Riders.
 */
export class NotificationService {
  constructor() {
    this.broadcastFn = null;
  }

  setBroadcaster(fn) {
    this.broadcastFn = fn;
  }

  broadcast(event, data) {
    if (typeof this.broadcastFn === 'function') {
      try {
        this.broadcastFn(event, data);
      } catch (e) {
        console.error('[NotificationService Broadcast Error]:', e);
      }
    }
  }

  async createNotification({ type, title, message, entityType = 'order', entityId = null, storeId = 'store_royal_001' }) {
    const id = 'notif_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO notification_events (id, store_id, tenant_id, type, event_type, title, message, entity_type, entity_id, read_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [id, storeId, storeId, type, type, title, message, entityType, entityId, now]);

    const notif = {
      id,
      store_id: storeId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      read_status: 0,
      created_at: now
    };

    // Broadcast live to all UI subscribers
    this.broadcast('notification_received', notif);

    return notif;
  }

  async getNotifications({ limit = 30, storeId = 'store_royal_001' } = {}) {
    return query(`
      SELECT * FROM notification_events
      WHERE store_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [storeId, limit]);
  }

  async getUnreadCount(storeId = 'store_royal_001') {
    const row = await getOne(`
      SELECT COUNT(*) as count FROM notification_events
      WHERE store_id = ? AND read_status = 0
    `, [storeId]);
    return row?.count || 0;
  }

  async markAsRead(id) {
    await execute('UPDATE notification_events SET read_status = 1 WHERE id = ?', [id]);
    return { success: true };
  }

  async markAllAsRead(storeId = 'store_royal_001') {
    await execute('UPDATE notification_events SET read_status = 1 WHERE store_id = ?', [storeId]);
    return { success: true };
  }
}

export const notificationService = new NotificationService();
