import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { signAccessToken } from '@ecommerce/common';
import { createApp } from '../app';
import { ProductModel } from '../models/product.model';
import { catalogService } from '../services/catalog.service';

const app = createApp();
let mongo: MongoMemoryServer;
const adminToken = signAccessToken({ sub: 'admin1', email: 'admin@shop.test', role: 'admin' });
const customerToken = signAccessToken({ sub: 'cust1', email: 'c@shop.test', role: 'customer' });
const INTERNAL_KEY = 'test-internal-key';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

async function seedProduct(overrides: Record<string, unknown> = {}) {
  return ProductModel.create({
    name: 'Widget',
    price: 1000,
    currency: 'usd',
    sku: `SKU-${Math.random().toString(36).slice(2)}`,
    stock: 5,
    ...overrides,
  });
}

describe('product CRUD', () => {
  it('lists only active products', async () => {
    await seedProduct({ name: 'A' });
    await seedProduct({ name: 'B', active: false });
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe('A');
  });

  it('requires admin role to create a product', async () => {
    const body = { name: 'New', price: 500, sku: 'SKU-NEW' };
    const noAuth = await request(app).post('/products').send(body);
    expect(noAuth.status).toBe(401);

    const asCustomer = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(body);
    expect(asCustomer.status).toBe(403);

    const asAdmin = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(asAdmin.status).toBe(201);
    expect(asAdmin.body.product.id).toBeDefined();
  });
});

describe('stock reservation (service)', () => {
  it('atomically decrements stock and returns enriched lines', async () => {
    const p = await seedProduct({ stock: 5, price: 1000, name: 'Widget' });
    const reserved = await catalogService.reserveStock([{ productId: p.id, quantity: 2 }]);
    expect(reserved).toEqual([
      expect.objectContaining({ productId: p.id, name: 'Widget', unitPrice: 1000, quantity: 2 }),
    ]);
    const after = await ProductModel.findById(p.id);
    expect(after?.stock).toBe(3);
  });

  it('compensates (restores other items) when one line lacks stock', async () => {
    const a = await seedProduct({ stock: 5 });
    const b = await seedProduct({ stock: 1 });
    await expect(
      catalogService.reserveStock([
        { productId: a.id, quantity: 2 },
        { productId: b.id, quantity: 5 }, // not enough → whole reservation fails
      ]),
    ).rejects.toThrow(/Insufficient stock/);

    // a's reservation must have been rolled back
    const afterA = await ProductModel.findById(a.id);
    const afterB = await ProductModel.findById(b.id);
    expect(afterA?.stock).toBe(5);
    expect(afterB?.stock).toBe(1);
  });

  it('releaseStock returns inventory', async () => {
    const p = await seedProduct({ stock: 3 });
    await catalogService.releaseStock([{ productId: p.id, quantity: 2 }]);
    const after = await ProductModel.findById(p.id);
    expect(after?.stock).toBe(5);
  });
});

describe('internal reserve-stock endpoint', () => {
  it('rejects without the internal API key', async () => {
    const p = await seedProduct();
    const res = await request(app)
      .post('/internal/reserve-stock')
      .send({ items: [{ productId: p.id, quantity: 1 }] });
    expect(res.status).toBe(401);
  });

  it('reserves with a valid internal API key', async () => {
    const p = await seedProduct({ stock: 4 });
    const res = await request(app)
      .post('/internal/reserve-stock')
      .set('x-internal-api-key', INTERNAL_KEY)
      .send({ items: [{ productId: p.id, quantity: 3 }] });
    expect(res.status).toBe(200);
    expect(res.body.reserved[0].quantity).toBe(3);
  });
});
