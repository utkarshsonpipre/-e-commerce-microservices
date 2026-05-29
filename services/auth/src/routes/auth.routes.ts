import { Router } from 'express';
import { asyncHandler, authenticate } from '@ecommerce/common';
import { authController } from '../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(authController.register));
authRouter.post('/login', asyncHandler(authController.login));
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
