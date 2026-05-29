import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Spy on the mailer so we can assert sends without real email.
jest.mock('../mailer', () => ({
  mailer: { send: jest.fn().mockResolvedValue(undefined) },
}));

import { notificationService } from '../services/notification.service';
import { mailer } from '../mailer';
import { NotificationModel } from '../models/notification.model';

const sendMock = mailer.send as jest.Mock;
let mongo: MongoMemoryServer;

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

describe('event handlers', () => {
  it('sends a welcome email on user.registered', async () => {
    await notificationService.onUserRegistered(
      { userId: 'u1', email: 'u1@shop.test', name: 'Uno' },
      'evt-1',
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'u1@shop.test', subject: expect.stringContaining('Welcome') }),
    );
    expect(await NotificationModel.countDocuments()).toBe(1);
  });

  it('records the contact email on order.created and uses it for payment events', async () => {
    const order = {
      orderId: 'o1',
      userId: 'u1',
      email: 'buyer@shop.test',
      items: [{ productId: 'p1', name: 'Widget', quantity: 2, unitPrice: 1000 }],
      totalAmount: 2000,
      currency: 'usd',
    };
    await notificationService.onOrderCreated(order, 'evt-order');
    expect(sendMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: 'buyer@shop.test', subject: expect.stringContaining('Order received') }),
    );

    // payment.succeeded carries no email — it must be resolved from the order contact.
    await notificationService.onPaymentSucceeded(
      { orderId: 'o1', paymentId: 'pi_1', amount: 2000, currency: 'usd' },
      'evt-pay',
    );
    expect(sendMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: 'buyer@shop.test', subject: expect.stringContaining('Payment confirmed') }),
    );
  });

  it('does not send a payment email when the order contact is unknown', async () => {
    await notificationService.onPaymentSucceeded(
      { orderId: 'unknown', paymentId: 'pi_x', amount: 100, currency: 'usd' },
      'evt-unknown',
    );
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('idempotency', () => {
  it('sends only once for a redelivered event id', async () => {
    const payload = { userId: 'u1', email: 'u1@shop.test', name: 'Uno' };
    await notificationService.onUserRegistered(payload, 'evt-dup');
    await notificationService.onUserRegistered(payload, 'evt-dup');
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(await NotificationModel.countDocuments()).toBe(1);
  });
});
