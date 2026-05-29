import { Router } from 'express';
import { asyncHandler, authenticate } from '@ecommerce/common';
import { paymentController } from '../controllers/payment.controller';

export const paymentRouter = Router();

// Authenticated: a customer fetches the payment status/secret for their order.
paymentRouter.get('/order/:orderId', authenticate, asyncHandler(paymentController.getByOrder));
