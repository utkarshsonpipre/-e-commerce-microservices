import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

jest.mock('../events/bus', () => ({
  bus: {
    publish: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
  },
}));

import { createApp } from '../app';
import { bus } from '../events/bus';
import { paymentService } from '../services/payment.service';
import { PaymentModel } from '../models/payment.model';

const app = createApp();
let mongo: MongoMemoryServer;

const orderEvent = {
  orderId: 'order-1',
  userId: 'user-1',
  email: 'user1@shop.test',
  items: [{ productId: 'p1', name: 'Widget', quantity: 2, unitPrice: 1000 }],
  totalAmount: 2000,
  currency: 'usd',
};

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

describe('handleOrderCreated', () => {
  it('creates a pending payment with a (mock) PaymentIntent', async () => {
    await paymentService.handleOrderCreated(orderEvent);
    const payment = await PaymentModel.findOne({ orderId: 'order-1' });
    expect(payment).not.toBeNull();
    expect(payment?.status).toBe('pending');
    expect(payment?.amount).toBe(2000);
    expect(payment?.providerPaymentId).toMatch(/^pi_mock_/);
    expect(payment?.clientSecret).toContain('_secret_mock');
  });

  it('is idempotent for a duplicate order.created', async () => {
    await paymentService.handleOrderCreated(orderEvent);
    await paymentService.handleOrderCreated(orderEvent);
    const count = await PaymentModel.countDocuments({ orderId: 'order-1' });
    expect(count).toBe(1);
  });
});

describe('webhook → payment outcome', () => {
  async function seedPendingPayment() {
    await paymentService.handleOrderCreated(orderEvent);
    return PaymentModel.findOne({ orderId: 'order-1' });
  }

  it('marks succeeded and publishes payment.succeeded', async () => {
    const payment = await seedPendingPayment();
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: payment!.providerPaymentId } },
    };

    const res = await request(app)
      .post('/webhooks/stripe')
      .set('content-type', 'application/json')
      .send(event);

    expect(res.status).toBe(200);
    const reloaded = await PaymentModel.findOne({ orderId: 'order-1' });
    expect(reloaded?.status).toBe('succeeded');
    expect(bus.publish).toHaveBeenCalledWith(
      'payment.succeeded',
      expect.objectContaining({ orderId: 'order-1', amount: 2000 }),
    );
  });

  it('marks failed and publishes payment.failed', async () => {
    const payment = await seedPendingPayment();
    const event = {
      id: 'evt_2',
      type: 'payment_intent.payment_failed',
      data: {
        object: { id: payment!.providerPaymentId, last_payment_error: { message: 'card_declined' } },
      },
    };

    const res = await request(app)
      .post('/webhooks/stripe')
      .set('content-type', 'application/json')
      .send(event);

    expect(res.status).toBe(200);
    const reloaded = await PaymentModel.findOne({ orderId: 'order-1' });
    expect(reloaded?.status).toBe('failed');
    expect(reloaded?.failureReason).toBe('card_declined');
    expect(bus.publish).toHaveBeenCalledWith(
      'payment.failed',
      expect.objectContaining({ orderId: 'order-1', reason: 'card_declined' }),
    );
  });

  it('is idempotent on duplicate succeeded webhooks', async () => {
    const payment = await seedPendingPayment();
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: payment!.providerPaymentId } },
    };
    await request(app).post('/webhooks/stripe').set('content-type', 'application/json').send(event);
    await request(app).post('/webhooks/stripe').set('content-type', 'application/json').send(event);
    // Only the first transition should have published an event.
    expect(bus.publish).toHaveBeenCalledTimes(1);
  });
});
