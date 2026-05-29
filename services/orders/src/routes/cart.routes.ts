import { Router } from 'express';
import { asyncHandler, authenticate } from '@ecommerce/common';
import { cartController } from '../controllers/cart.controller';

export const cartRouter = Router();

// All cart routes require an authenticated user.
cartRouter.use(authenticate);

cartRouter.get('/', asyncHandler(cartController.get));
cartRouter.post('/items', asyncHandler(cartController.addItem));
cartRouter.delete('/items/:productId', asyncHandler(cartController.removeItem));
cartRouter.delete('/', asyncHandler(cartController.clear));
