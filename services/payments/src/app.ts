import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { asyncHandler, errorHandler, notFoundHandler } from '@ecommerce/common';
import { paymentController } from './controllers/payment.controller';
import { paymentRouter } from './routes/payment.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());

  // IMPORTANT: the Stripe webhook needs the raw body for signature verification,
  // so it must be registered with express.raw() BEFORE the global JSON parser.
  app.post('/webhooks/stripe', express.raw({ type: '*/*' }), asyncHandler(paymentController.webhook));

  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'payments' }));

  app.use('/payments', paymentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
