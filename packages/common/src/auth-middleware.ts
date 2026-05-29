import { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from './errors';
import { AccessTokenClaims, UserRole, verifyAccessToken } from './jwt';

/** The authenticated user attached to a request by `authenticate`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

// Augment Express's Request so `req.user` is typed everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function toUser(claims: AccessTokenClaims): AuthenticatedUser {
  return { id: claims.sub, email: claims.email, role: claims.role };
}

/** Require a valid access token. Populates `req.user` or rejects with 401. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) {
    return next(new UnauthorizedError('Missing Bearer token'));
  }
  req.user = toUser(verifyAccessToken(token));
  next();
};

/** Attach `req.user` if a valid token is present, but never reject. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (token) {
    try {
      req.user = toUser(verifyAccessToken(token));
    } catch {
      /* ignore — treat as anonymous */
    }
  }
  next();
};

/** Require the authenticated user to have one of the given roles. */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
