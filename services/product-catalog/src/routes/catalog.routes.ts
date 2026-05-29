import { Router } from 'express';
import { asyncHandler, authenticate, requireRole } from '@ecommerce/common';
import { catalogController } from '../controllers/catalog.controller';
import { internalAuth } from '../middleware/internal-auth';

export const catalogRouter = Router();

// ── Public read endpoints ────────────────────────────────────────────────
catalogRouter.get('/products', asyncHandler(catalogController.list));
catalogRouter.get('/products/:id', asyncHandler(catalogController.getById));

// ── Admin-only write endpoints ───────────────────────────────────────────
catalogRouter.post('/products', authenticate, requireRole('admin'), asyncHandler(catalogController.create));
catalogRouter.patch('/products/:id', authenticate, requireRole('admin'), asyncHandler(catalogController.update));
catalogRouter.delete('/products/:id', authenticate, requireRole('admin'), asyncHandler(catalogController.remove));

// ── Internal service-to-service endpoints (orders → catalog) ──────────────
catalogRouter.post('/internal/reserve-stock', internalAuth, asyncHandler(catalogController.reserveStock));
catalogRouter.post('/internal/release-stock', internalAuth, asyncHandler(catalogController.releaseStock));
