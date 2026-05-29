import { intEnv, optionalEnv, requireEnv } from '@ecommerce/common';

export const config = {
  serviceName: 'orders',
  port: intEnv('PORT', 3003),
  mongoUri: requireEnv('MONGO_URI'),
  rabbitUrl: optionalEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
  catalogUrl: optionalEnv('CATALOG_SERVICE_URL', 'http://localhost:3002'),
  internalApiKey: optionalEnv('INTERNAL_API_KEY', 'dev-internal-key'),
} as const;
