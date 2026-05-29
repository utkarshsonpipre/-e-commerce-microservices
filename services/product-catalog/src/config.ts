import { intEnv, optionalEnv, requireEnv } from '@ecommerce/common';

export const config = {
  serviceName: 'product-catalog',
  port: intEnv('PORT', 3002),
  mongoUri: requireEnv('MONGO_URI'),
  // Shared secret guarding internal service-to-service endpoints.
  internalApiKey: optionalEnv('INTERNAL_API_KEY', 'dev-internal-key'),
} as const;
