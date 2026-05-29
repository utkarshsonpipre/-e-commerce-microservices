import { intEnv, optionalEnv, requireEnv } from '@ecommerce/common';

const stripeSecretKey = optionalEnv('STRIPE_SECRET_KEY', '');

export const config = {
  serviceName: 'payments',
  port: intEnv('PORT', 3004),
  mongoUri: requireEnv('MONGO_URI'),
  rabbitUrl: optionalEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
  stripeSecretKey,
  stripeWebhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),
  // When no real key is configured we run a stub gateway so the whole platform
  // works end-to-end locally without Stripe credentials.
  stripeEnabled: stripeSecretKey.startsWith('sk_') && !stripeSecretKey.includes('xxx'),
} as const;
