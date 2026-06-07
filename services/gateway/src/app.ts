import express, { Express, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { authenticate, createLogger, errorHandler, notFoundHandler } from '@ecommerce/common';
import { config } from './config';

const log = createLogger('gateway');

/**
 * Build a reverse-proxy handler to a target service.
 *
 * `prefix` is the path the upstream service expects (e.g. '/auth'). Because the
 * proxy is mounted with app.use('/api/auth', ...), Express has already stripped
 * '/api/auth' by the time the proxy runs, so we PREPEND the service prefix to
 * the remaining path: '/register' → '/auth/register', '/' → '/auth'.
 */
function proxy(target: string, prefix: string): RequestHandler {
  const rewrite: Options['pathRewrite'] = (path) => {
    const rest = path === '/' ? '' : path; // avoid a trailing-slash-only path
    const result = `${prefix}${rest}`;
    return result === '' ? '/' : result;
  };
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: rewrite,
    on: {
      error: (err, _req, res) => {
        log.error({ err, target }, 'Upstream proxy error');
        // res may be a ServerResponse; guard before writing.
        if ('writeHead' in res && !res.headersSent) {
          res.writeHead(502, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Upstream service unavailable' } }));
        }
      },
    },
  });
}

export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy (Render, Nginx, etc.) the real client IP is in
  // X-Forwarded-For. Trust the first proxy hop so express-rate-limit can
  // identify clients correctly instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors());

  // NOTE: no body parser here. The gateway streams request bodies straight
  // through to services, which keeps the Stripe webhook's raw body intact.

  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));
  app.get('/', (_req, res) =>
    res.json({
      service: 'ecommerce-gateway',
      routes: ['/api/auth', '/api/products', '/api/cart', '/api/orders', '/api/payments', '/api/notifications'],
    }),
  );

  app.use('/api', limiter);

  // ── Public routes ────────────────────────────────────────────────────────
  app.use('/api/auth', proxy(config.services.auth, '/auth'));
  app.use('/api/products', proxy(config.services.catalog, '/products'));
  // Stripe posts directly to the gateway; forward (raw body preserved).
  app.use('/webhooks/stripe', proxy(config.services.payments, '/webhooks/stripe'));

  // ── Protected routes (gateway verifies the JWT; services verify again) ─────
  app.use('/api/cart', authenticate, proxy(config.services.orders, '/cart'));
  app.use('/api/orders', authenticate, proxy(config.services.orders, '/orders'));
  app.use('/api/payments', authenticate, proxy(config.services.payments, '/payments'));
  app.use('/api/notifications', proxy(config.services.notifications, '/notifications'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
