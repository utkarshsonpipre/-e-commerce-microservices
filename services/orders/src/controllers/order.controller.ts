import { RequestHandler } from 'express';
import { z } from 'zod';
import { BadRequestError } from '@ecommerce/common';
import { orderService } from '../services/order.service';
import { cartService } from '../services/cart.service';

const checkoutSchema = z.object({
  // Optional: if omitted, the user's cart is used.
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() }))
    .optional(),
});

export const orderController = {
  /** Checkout: create an order from explicit items or from the user's cart. */
  create: (async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);

    const user = req.user!;
    let items = parsed.data.items;
    if (!items || items.length === 0) {
      const cart = await cartService.get(user.id);
      items = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    }
    if (items.length === 0) throw new BadRequestError('No items to order');

    const order = await orderService.checkout({ id: user.id, email: user.email }, items);
    await cartService.clear(user.id);

    res.status(201).json({ order });
  }) as RequestHandler,

  list: (async (req, res) => {
    const orders = await orderService.listByUser(req.user!.id);
    res.json({ orders });
  }) as RequestHandler,

  getById: (async (req, res) => {
    const order = await orderService.getForUser(req.user!.id, req.params.id);
    res.json({ order });
  }) as RequestHandler,
};
