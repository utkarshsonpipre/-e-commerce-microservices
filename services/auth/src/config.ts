import { intEnv, optionalEnv, requireEnv } from '@ecommerce/common';

export const config = {
  serviceName: 'auth',
  port: intEnv('PORT', 3001),
  mongoUri: requireEnv('MONGO_URI'),
  rabbitUrl: optionalEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
  bcryptRounds: intEnv('BCRYPT_ROUNDS', 10),
} as const;
