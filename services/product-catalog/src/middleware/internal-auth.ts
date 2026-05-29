import { RequestHandler } from 'express';
import { UnauthorizedError } from '@ecommerce/common';
import { config } from '../config';

/**
 * Guards internal service-to-service endpoints with a shared secret header.
 * Callers (e.g. the orders service) send `x-internal-api-key`.
 */
export const internalAuth: RequestHandler = (req, _res, next) => {
  const key = req.headers['x-internal-api-key'];
  if (key !== config.internalApiKey) {
    return next(new UnauthorizedError('Invalid internal API key'));
  }
  next();
};
