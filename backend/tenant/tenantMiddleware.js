import { getOne, query, execute } from '../db.js';
import { tokenService } from '../auth/tokenService.js';

/**
 * Tenant Resolution & Access Isolation Middleware for Multi-Tenant SaaS
 * Enforces:
 * 1. Strict Tenant Scoping: Authenticated store users (OWNER, CASHIER, DELIVERY)
 *    can ONLY access their own assigned tenant (req.user.tenantId).
 *    Any x-tenant-id override attempt from non-platform users is strictly ignored.
 * 2. Platform Admin Super Access: Only PLATFORM_ADMIN users can access company
 *    platform management (/api/platform/admin/...) and manage all registered stores.
 * 3. Public Storefront Routing: Resolves tenant from custom domain, subdomain,
 *    x-tenant-id, or fallback for unauthenticated grocery shoppers.
 */
export async function resolveTenant(req, res, next) {
  try {
    let tenantKey = null;

    // 1. Check Bearer Authorization token
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = tokenService.extractToken(authHeader);
      const decoded = tokenService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    // 2. Multi-Tenant Role Isolation
    if (req.user && req.user.role !== 'PLATFORM_ADMIN') {
      // Store user (Owner, Manager, Cashier, Delivery) - STRICTLY LOCKED to their own store!
      tenantKey = req.user.tenantId;

      // Restrict access to company platform administration
      if (req.originalUrl.startsWith('/api/platform/admin') || 
          req.originalUrl.startsWith('/api/platform/applications') ||
          req.originalUrl === '/api/platform/tenants') {
        return res.status(403).json({
          error: 'Access denied: Company Platform Control Center is restricted to platform administrators.',
          required_role: 'PLATFORM_ADMIN'
        });
      }
    } else {
      // Platform Admin or Unauthenticated Public Storefront
      tenantKey = req.headers['x-tenant-id'] || req.headers['x-tenant-slug'];

      if (!tenantKey && req.query.tenant) {
        tenantKey = String(req.query.tenant).trim();
      }

      if (!tenantKey && req.hostname) {
        const parts = req.hostname.split('.');
        if (parts.length > 2 && !['api', 'www', 'localhost', '127'].includes(parts[0])) {
          tenantKey = parts[0];
        }
      }
    }

    let tenant = null;
    if (tenantKey) {
      tenant = await getOne(
        'SELECT * FROM tenants WHERE id = ? OR slug = ? OR custom_domain = ? LIMIT 1',
        [tenantKey, tenantKey, tenantKey]
      );
    }

    // Check custom domain registry in tenant_domains (supports req.hostname, host header, x-forwarded-host, and x-custom-domain)
    const incomingHost = (req.headers['x-custom-domain'] || req.headers['x-forwarded-host'] || req.headers['host'] || req.hostname || '').split(':')[0].toLowerCase();
    if (!tenant && incomingHost && !['localhost', '127.0.0.1'].includes(incomingHost)) {
      try {
        const domainMatch = await getOne(
          `SELECT t.* FROM tenant_domains td 
           JOIN tenants t ON td.tenant_id = t.id 
           WHERE td.domain = ? AND td.verification_status = 'VERIFIED' AND td.ssl_status = 'ACTIVE' 
           LIMIT 1`,
          [incomingHost]
        );
        if (domainMatch) {
          tenant = domainMatch;
        }
      } catch (err) {
        // Table might not exist yet or error
      }
    }

    // Default Fallback to store_royal_001 so legacy endpoints never break
    if (!tenant) {
      tenant = await getOne("SELECT * FROM tenants WHERE id = 'store_royal_001' LIMIT 1");
      if (!tenant) {
        tenant = await getOne('SELECT * FROM tenants ORDER BY created_at ASC LIMIT 1');
      }
    }

    req.tenant = tenant;

    // Check store suspension
    const isPlatformRoute = req.originalUrl.startsWith('/api/platform');
    const isLoginRoute = req.originalUrl.startsWith('/api/auth/login');
    const isEventsRoute = req.originalUrl.startsWith('/api/events');

    if (tenant && tenant.status === 'SUSPENDED' && !isPlatformRoute && !isLoginRoute && !isEventsRoute) {
      return res.status(403).json({
        error: 'This store is temporarily unavailable.',
        tenant_status: 'SUSPENDED',
        store_name: tenant.name,
        message: 'Your store account is currently suspended. Please contact platform support.'
      });
    }

    next();
  } catch (err) {
    console.error('[Tenant Resolution Error]:', err);
    next();
  }
}

/**
 * Audit Logging Helper
 */
export async function logAuditEvent({
  tenantId,
  userId,
  userName,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  ip = null,
  userAgent = null
}) {
  try {
    const id = 'aud_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    await execute(`
      INSERT INTO audit_logs (
        id, store_id, tenant_id, user_name, action, entity_type, entity_id,
        details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      tenantId || 'global',
      tenantId || 'global',
      userName || 'System',
      action,
      entityType,
      entityId || null,
      JSON.stringify({ userId, old: oldValues, new: newValues, ip, userAgent }),
      now
    ]);
  } catch (e) {
    console.warn('[Audit Log Failed]:', e.message);
  }
}
