import { query, getOne, execute } from '../db.js';

/**
 * Delivery Management Service
 * Handles live rider location tracking sessions, active delivery tracking,
 * failed delivery handling, zones & PIN code management, and status transitions.
 */
export class DeliveryService {
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
        console.error('[DeliveryService Broadcast Error]:', e);
      }
    }
  }

  /**
   * Start / Update Active Tracking Session
   * Called when rider accepts / starts delivery (OUT_FOR_DELIVERY)
   */
  async startTrackingSession({ orderId, agentId, agentName, latitude, longitude }) {
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found');

    let resolvedAgentName = agentName;
    if (!resolvedAgentName && agentId) {
      const user = await getOne('SELECT name FROM users WHERE id = ?', [agentId]);
      resolvedAgentName = user?.name || `Rider ${agentId}`;
    }

    const now = new Date().toISOString();
    let session = await getOne('SELECT * FROM delivery_tracking_sessions WHERE order_id = ? AND status = "ACTIVE"', [orderId]);

    const lat = latitude ? Number(latitude) : null;
    const lng = longitude ? Number(longitude) : null;

    if (!session) {
      const sessionId = 'trk_' + Math.random().toString(36).substring(2, 9);
      await execute(`
        INSERT INTO delivery_tracking_sessions (
          id, order_id, agent_id, agent_name, status,
          started_at, start_lat, start_lng, current_lat, current_lng, updated_at
        ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?)
      `, [sessionId, order.id, agentId, resolvedAgentName, now, lat, lng, lat, lng, now]);

      session = await getOne('SELECT * FROM delivery_tracking_sessions WHERE id = ?', [sessionId]);
    } else {
      await execute(`
        UPDATE delivery_tracking_sessions SET
          current_lat = ?, current_lng = ?, updated_at = ?
        WHERE id = ?
      `, [lat, lng, now, session.id]);
    }

    // Record breadcrumb location point
    if (lat && lng) {
      await execute(`
        INSERT INTO delivery_locations (id, session_id, agent_id, order_id, latitude, longitude, timestamp, tracking_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `, ['loc_' + Math.random().toString(36).substring(2, 9), session.id, agentId, orderId, lat, lng, now]);
    }

    const tenantId = order.tenant_id || order.store_id || 'store_royal_001';
    this.broadcast('rider_location_updated', {
      order_id: orderId,
      agent_id: agentId,
      agent_name: resolvedAgentName,
      latitude: lat,
      longitude: lng,
      timestamp: now,
      tenant_id: tenantId
    }, tenantId, `tenant:${tenantId}:delivery:${orderId}`);

    return session;
  }

  /**
   * Record Rider Location Update
   */
  async updateLocation({ agentId, orderId, latitude, longitude, accuracy, speed, heading }) {
    const now = new Date().toISOString();
    const lat = Number(latitude);
    const lng = Number(longitude);

    let session = null;
    if (orderId) {
      session = await getOne('SELECT * FROM delivery_tracking_sessions WHERE order_id = ? AND status = "ACTIVE"', [orderId]);
    } else {
      session = await getOne('SELECT * FROM delivery_tracking_sessions WHERE agent_id = ? AND status = "ACTIVE" ORDER BY updated_at DESC LIMIT 1', [agentId]);
    }

    const sessionId = session?.id || 'standalone';
    const effectiveOrderId = session?.order_id || orderId || null;

    let tenantId = 'store_royal_001';
    if (effectiveOrderId) {
      const order = await getOne('SELECT tenant_id, store_id FROM orders WHERE id = ?', [effectiveOrderId]);
      if (order) tenantId = order.tenant_id || order.store_id || tenantId;
    }

    await execute(`
      INSERT INTO delivery_locations (
        id, session_id, tenant_id, agent_id, order_id, latitude, longitude, accuracy, speed, heading, timestamp, tracking_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [
      'loc_' + Math.random().toString(36).substring(2, 9),
      sessionId, tenantId, agentId, effectiveOrderId, lat, lng,
      accuracy || null, speed || null, heading || null, now
    ]);

    if (session) {
      await execute(`
        UPDATE delivery_tracking_sessions SET
          current_lat = ?, current_lng = ?, updated_at = ?
        WHERE id = ?
      `, [lat, lng, now, session.id]);
    }

    this.broadcast('rider_location_updated', {
      order_id: effectiveOrderId,
      agent_id: agentId,
      latitude: lat,
      longitude: lng,
      accuracy,
      speed,
      timestamp: now,
      tenant_id: tenantId
    }, tenantId, effectiveOrderId ? `tenant:${tenantId}:delivery:${effectiveOrderId}` : null);

    return { success: true, timestamp: now };
  }

  /**
   * Complete Tracking Session
   * Called when delivery is finished or cancelled
   */
  async endTrackingSession(orderId, status = 'COMPLETED') {
    const now = new Date().toISOString();
    await execute(`
      UPDATE delivery_tracking_sessions SET
        status = ?, ended_at = ?, updated_at = ?
      WHERE order_id = ? AND status = "ACTIVE"
    `, [status, now, now, orderId]);

    this.broadcast('tracking_session_ended', { order_id: orderId, status, ended_at: now });
  }

  /**
   * Get Active Tracking Session for Customer & Store
   */
  async getTrackingDetails(orderId) {
    const order = await getOne('SELECT * FROM orders WHERE id = ? OR order_number = ?', [orderId, orderId]);
    if (!order) throw new Error('Order not found');

    const session = await getOne(`
      SELECT * FROM delivery_tracking_sessions
      WHERE order_id = ?
      ORDER BY updated_at DESC LIMIT 1
    `, [order.id]);

    const locations = session ? await query(`
      SELECT latitude, longitude, timestamp FROM delivery_locations
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `, [session.id]) : [];

    const store = await getOne('SELECT * FROM stores LIMIT 1');

    return {
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        customer_name: order.customer_name,
        delivery_address: order.delivery_address,
        area: order.area,
        pincode: order.pincode,
        latitude: order.latitude,
        longitude: order.longitude,
        assigned_delivery_boy_name: order.assigned_delivery_boy_name,
        estimated_delivery_mins: order.estimated_delivery_mins || '30-45 mins',
        total_amount: order.total_amount
      },
      tracking_session: session || null,
      recent_coordinates: locations.slice(-20),
      current_rider_location: session?.current_lat && session?.current_lng ? {
        latitude: session.current_lat,
        longitude: session.current_lng,
        updated_at: session.updated_at
      } : null,
      store_location: {
        name: store?.name || 'Kirana Store',
        address: store?.address || 'Main Market',
        latitude: 17.4875, // Hyderabad default or store geo
        longitude: 78.3953
      }
    };
  }

  /**
   * Handle Failed Delivery Attempt
   */
  async recordDeliveryFailure({ orderId, agentId, agentName, reason, notes }) {
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found');

    const now = new Date().toISOString();
    const finalReason = reason || 'CUSTOMER_UNAVAILABLE';
    const detailNotes = notes || `Delivery attempt failed: ${finalReason}`;

    await execute(`
      UPDATE orders SET
        status = 'FAILED',
        delivery_failure_reason = ?,
        delivery_notes = ?,
        updated_at = ?
      WHERE id = ?
    `, [finalReason, detailNotes, now, order.id]);

    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, 'FAILED', ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      order.id, order.payment_status,
      `Delivery failed. Reason: ${finalReason}. Notes: ${detailNotes}`,
      agentName || 'Delivery Partner', now
    ]);

    await this.endTrackingSession(order.id, 'FAILED');

    this.broadcast('delivery_failed', {
      order_id: order.id,
      order_number: order.order_number,
      agent_id: agentId,
      agent_name: agentName,
      reason: finalReason,
      notes: detailNotes,
      failed_at: now
    });

    return {
      success: true,
      message: 'Delivery marked as failed and store owner alerted.',
      order_id: order.id,
      status: 'FAILED',
      reason: finalReason
    };
  }
}

export const deliveryService = new DeliveryService();
