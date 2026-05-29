import { intEnv, optionalEnv, requireEnv } from '@ecommerce/common';

export const config = {
  serviceName: 'notifications',
  port: intEnv('PORT', 3005),
  mongoUri: requireEnv('MONGO_URI'),
  rabbitUrl: optionalEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
  // 'log' prints emails to stdout; 'smtp' uses the SMTP_* settings (e.g. Mailhog).
  mailTransport: optionalEnv('MAIL_TRANSPORT', 'log') as 'log' | 'smtp',
  smtpHost: optionalEnv('SMTP_HOST', 'localhost'),
  smtpPort: intEnv('SMTP_PORT', 1025),
  mailFrom: optionalEnv('MAIL_FROM', 'no-reply@shop.example'),
} as const;
