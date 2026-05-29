import { Router } from 'express';
import { asyncHandler, authenticate } from '@ecommerce/common';
import { orderController } from '../controllers/order.controller';

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.post('/', asyncHandler(orderController.create));
orderRouter.get('/', asyncHandler(orderController.list));
orderRouter.get('/:id', asyncHandler(orderController.getById));
