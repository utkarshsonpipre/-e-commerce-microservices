import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock the outbound dependencies: the catalog HTTP client and the message bus.
jest.mock('../clients/catalog.client', () => ({
  catalogClient: {
    reserveStock: jest.fn(),
    releaseStock: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../events/bus', () => ({
  bus: {
    publish: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
  },
}));

import { orderService } from '../services/order.service';
import { catalogClient } from '../clients/catalog.client';
import { bus } from '../events/bus';
import { OrderModel } from '../models/order.model';

const mockedCatalog = catalogClient as jest.Mocked<typeof catalogClient>;
let mongo: MongoMemoryServer;
const user = { id: 'user1', email: 'user1@shop.test' };

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
  jest.clearAllMocks();
});

describe('checkout (saga start)', () => {
  it('reserves stock, creates a pending order, and publishes order.created', async () => {
    mockedCatalog.reserveStock.mockResolvedValue([
      { productId: 'p1', name: 'Widget', unitPrice: 1000, currency: 'usd', quantity: 2 },
      { productId: 'p2', name: 'Gadget', unitPrice: 500, currency: 'usd', quantity: 1 },
    ]);

    const order = await orderService.checkout(user, [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ]);

    expect(order.status).toBe('pending_payment');
    expect(order.totalAmount).toBe(2500); // 2*1000 + 1*500
    expect(mockedCatalog.reserveStock).toHaveBeenCalledTimes(1);
    expect(bus.publish).toHaveBeenCalledWith(
      'order.created',
      expect.objectContaining({ orderId: order.id, totalAmount: 2500, email: user.email }),
    );
  });

  it('compensates (releases stock) if order creation fails after reservation', async () => {
    mockedCatalog.reserveStock.mockResolvedValue([
      { productId: 'p1', name: 'Widget', unitPrice: 1000, currency: 'usd', quantity: 1 },
    ]);
    // Force the publish step to throw so the compensation path runs.
    (bus.publish as jest.Mock).mockRejectedValueOnce(new Error('broker down'));

    await expect(orderService.checkout(user, [{ productId: 'p1', quantity: 1 }])).rejects.toThrow();
    expect(mockedCatalog.releaseStock).toHaveBeenCalledWith([{ productId: 'p1', quantity: 1 }]);
  });

  it('rejects an empty order', async () => {
    await expect(orderService.checkout(user, [])).rejects.toThrow(/no items/i);
  });
});

describe('payment outcome handlers (saga completion)', () => {
  async function seedPendingOrder() {
    return OrderModel.create({
      userId: user.id,
      email: user.email,
      items: [{ productId: 'p1', name: 'Widget', quantity: 1, unitPrice: 1000 }],
      totalAmount: 1000,
      currency: 'usd',
      status: 'pending_payment',
    });
  }

  it('markPaid transitions pending → paid and is idempotent', async () => {
    const order = await seedPendingOrder();
    await orderService.markPaid(order.id, 'pay_123');
    let reloaded = await OrderModel.findById(order.id);
    expect(reloaded?.status).toBe('paid');
    expect(reloaded?.paymentId).toBe('pay_123');

    // Duplicate delivery must not change anything.
    await orderService.markPaid(order.id, 'pay_999');
    reloaded = await OrderModel.findById(order.id);
    expect(reloaded?.paymentId).toBe('pay_123');
  });

  it('markFailed transitions pending → failed and releases stock', async () => {
    const order = await seedPendingOrder();
    await orderService.markFailed(order.id, 'card_declined');
    const reloaded = await OrderModel.findById(order.id);
    expect(reloaded?.status).toBe('failed');
    expect(mockedCatalog.releaseStock).toHaveBeenCalledWith([{ productId: 'p1', quantity: 1 }]);
  });
});

describe('ownership', () => {
  it('forbids reading another user’s order', async () => {
    const order = await OrderModel.create({
      userId: 'someone-else',
      email: 'x@shop.test',
      items: [{ productId: 'p1', name: 'W', quantity: 1, unitPrice: 100 }],
      totalAmount: 100,
      currency: 'usd',
      status: 'pending_payment',
    });
    await expect(orderService.getForUser(user.id, order.id)).rejects.toThrow(/not your order/i);
  });
});
