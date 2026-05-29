import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { asyncHandler, errorHandler, notFoundHandler } from '@ecommerce/common';
import { notificationService } from './services/notification.service';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notifications' }));

  // Debug/inspection endpoint: list notifications sent to an email address.
  app.get(
    '/notifications',
    asyncHandler(async (req, res) => {
      const email = String(req.query.email ?? '');
      const notifications = email ? await notificationService.listByEmail(email) : [];
      res.json({ notifications });
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
