import crypto from 'crypto';

/**
 * Enterprise JWT (JSON Web Token) Service
 * Implements RFC 7519 standard using native Node.js crypto (zero-dependency).
 */

const JWT_SECRET = process.env.JWT_SECRET || 'kirana_saas_jwt_secret_2026_prod_super_secure_enterprise_key';
const DEFAULT_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Base64Url encoding/decoding helpers
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export const tokenService = {
  /**
   * Generates a signed JWT token
   * @param {Object} payload Custom claims (userId, tenantId, role, permissions, etc.)
   * @param {number} expiresInSeconds Expiration duration in seconds (default: 7 days)
   * @returns {string} Signed JWT token string
   */
  generateToken(payload, expiresInSeconds = DEFAULT_EXPIRATION_SECONDS) {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  },

  /**
   * Verifies and decodes a JWT token
   * @param {string} token 
   * @returns {Object|null} Decoded payload if valid, null otherwise
   */
  verifyToken(token) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Timing-safe buffer comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);

      // Check expiration
      if (payload.exp && payload.exp < now) {
        return null; // Expired token
      }

      return payload;
    } catch {
      return null;
    }
  },

  /**
   * Safely decodes token payload without signature verification
   * @param {string} token
   * @returns {Object|null}
   */
  decodeToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      return JSON.parse(base64UrlDecode(parts[1]));
    } catch {
      return null;
    }
  },

  /**
   * Extracts raw token string from Authorization header
   * @param {string} authHeader e.g. "Bearer eyJhbGciOi..."
   * @returns {string|null}
   */
  extractToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : authHeader.trim();
  }
};
