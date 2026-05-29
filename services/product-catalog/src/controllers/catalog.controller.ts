import { RequestHandler } from 'express';
import { z } from 'zod';
import { BadRequestError } from '@ecommerce/common';
import { catalogService } from '../services/catalog.service';

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  currency: z.string().length(3).optional(),
  category: z.string().optional(),
  sku: z.string().min(1),
  stock: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

const updateSchema = productSchema.partial();

const stockLinesSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1),
});

function parse<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestError('Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

export const catalogController = {
  list: (async (req, res) => {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const result = await catalogService.list({
      category: req.query.category as string | undefined,
      q: req.query.q as string | undefined,
      page,
      limit,
    });
    res.json(result);
  }) as RequestHandler,

  getById: (async (req, res) => {
    const product = await catalogService.getById(req.params.id);
    res.json({ product });
  }) as RequestHandler,

  create: (async (req, res) => {
    const input = parse(productSchema, req.body);
    const product = await catalogService.create(input);
    res.status(201).json({ product });
  }) as RequestHandler,

  update: (async (req, res) => {
    const input = parse(updateSchema, req.body);
    const product = await catalogService.update(req.params.id, input);
    res.json({ product });
  }) as RequestHandler,

  remove: (async (req, res) => {
    await catalogService.remove(req.params.id);
    res.status(204).send();
  }) as RequestHandler,

  reserveStock: (async (req, res) => {
    const { items } = parse(stockLinesSchema, req.body);
    const reserved = await catalogService.reserveStock(items);
    res.json({ reserved });
  }) as RequestHandler,

  releaseStock: (async (req, res) => {
    const { items } = parse(stockLinesSchema, req.body);
    await catalogService.releaseStock(items);
    res.json({ released: true });
  }) as RequestHandler,
};
