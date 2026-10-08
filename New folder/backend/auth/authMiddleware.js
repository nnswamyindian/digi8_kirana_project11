import { tokenService } from './tokenService.js';

/**
 * Optional Authentication Middleware
 * If Authorization: Bearer <token> is present and valid, attaches decoded user to req.user.
 * Does not block if unauthenticated (allows public access).
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const rawToken = tokenService.extractToken(authHeader);
    const decoded = tokenService.verifyToken(rawToken);
    if (decoded) {
      req.user = decoded;
      req.token = rawToken;
    }
  }
  next();
}

/**
 * Required Authentication Middleware
 * Enforces that a valid, unexpired JWT is provided in Authorization header.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      error: 'Authentication required. Please provide Authorization: Bearer <token> header.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const rawToken = tokenService.extractToken(authHeader);
  const decoded = tokenService.verifyToken(rawToken);

  if (!decoded) {
    return res.status(401).json({
      error: 'Invalid or expired authentication token. Please log in again.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }

  req.user = decoded;
  req.token = rawToken;
  next();
}

/**
 * Role-Based Access Control (RBAC) Guard Middleware
 * @param {string[]} allowedRoles Array of acceptable roles (e.g. ['STORE_OWNER', 'STORE_MANAGER'])
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // If user is not yet populated, run requireAuth logic first
    if (!req.user) {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({
          error: 'Authentication required. Please log in.',
          code: 'AUTH_TOKEN_MISSING'
        });
      }
      const rawToken = tokenService.extractToken(authHeader);
      const decoded = tokenService.verifyToken(rawToken);
      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid or expired token.',
          code: 'AUTH_TOKEN_INVALID'
        });
      }
      req.user = decoded;
      req.token = rawToken;
    }

    const userRole = req.user.role;

    // PLATFORM_ADMIN always has super-user access to all routes
    if (userRole === 'PLATFORM_ADMIN') {
      return next();
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Role '${userRole}' is not authorized to access this resource.`,
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        required_roles: allowedRoles,
        current_role: userRole
      });
    }

    next();
  };
}
