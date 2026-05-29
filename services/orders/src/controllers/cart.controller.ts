import { RequestHandler } from 'express';
import { z } from 'zod';
import { BadRequestError } from '@ecommerce/common';
import { cartService } from '../services/cart.service';

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const cartController = {
  get: (async (req, res) => {
    const cart = await cartService.get(req.user!.id);
    res.json({ cart });
  }) as RequestHandler,

  addItem: (async (req, res) => {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    const cart = await cartService.addItem(req.user!.id, parsed.data.productId, parsed.data.quantity);
    res.json({ cart });
  }) as RequestHandler,

  removeItem: (async (req, res) => {
    const cart = await cartService.removeItem(req.user!.id, req.params.productId);
    res.json({ cart });
  }) as RequestHandler,

  clear: (async (req, res) => {
    await cartService.clear(req.user!.id);
    res.status(204).send();
  }) as RequestHandler,
};
