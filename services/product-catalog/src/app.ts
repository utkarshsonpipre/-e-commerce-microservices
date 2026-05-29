import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from '@ecommerce/common';
import { catalogRouter } from './routes/catalog.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'product-catalog' }));

  app.use('/', catalogRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
