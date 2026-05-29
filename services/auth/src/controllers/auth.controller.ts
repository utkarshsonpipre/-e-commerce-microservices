import { RequestHandler } from 'express';
import { z } from 'zod';
import { BadRequestError } from '@ecommerce/common';
import { authService } from '../services/auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function parse<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestError('Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

export const authController = {
  register: (async (req, res) => {
    const input = parse(registerSchema, req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  }) as RequestHandler,

  login: (async (req, res) => {
    const input = parse(loginSchema, req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  }) as RequestHandler,

  refresh: (async (req, res) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    const tokens = await authService.refresh(refreshToken);
    res.status(200).json(tokens);
  }) as RequestHandler,

  me: (async (req, res) => {
    const user = await authService.getById(req.user!.id);
    res.status(200).json({ user });
  }) as RequestHandler,
};
