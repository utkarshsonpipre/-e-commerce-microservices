import { intEnv, optionalEnv } from '@ecommerce/common';

export const config = {
  serviceName: 'gateway',
  port: intEnv('PORT', 3000),
  rateLimitWindowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitMax: intEnv('RATE_LIMIT_MAX', 100),
  services: {
    auth: optionalEnv('AUTH_SERVICE_URL', 'http://localhost:3001'),
    catalog: optionalEnv('CATALOG_SERVICE_URL', 'http://localhost:3002'),
    orders: optionalEnv('ORDERS_SERVICE_URL', 'http://localhost:3003'),
    payments: optionalEnv('PAYMENTS_SERVICE_URL', 'http://localhost:3004'),
    notifications: optionalEnv('NOTIFICATIONS_SERVICE_URL', 'http://localhost:3005'),
  },
} as const;
