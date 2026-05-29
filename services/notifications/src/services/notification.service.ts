import {
  OrderCreatedData,
  PaymentFailedData,
  PaymentSucceededData,
  UserRegisteredData,
  createLogger,
} from '@ecommerce/common';
import { mailer } from '../mailer';
import { NotificationModel } from '../models/notification.model';
import { OrderContactModel } from '../models/order-contact.model';

const log = createLogger('notifications:service');

function money(amount: number, currency: string): string {
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

/**
 * Send an email and record it — keyed by the source event id so a redelivered
 * event (RabbitMQ is at-least-once) never sends a duplicate. The unique index
 * on eventId is the backstop against races.
 */
async function deliver(params: {
  eventId: string;
  type: string;
  to: string;
  subject: string;
  body: string;
  relatedId?: string;
}): Promise<void> {
  const already = await NotificationModel.findOne({ eventId: params.eventId });
  if (already) {
    log.warn({ eventId: params.eventId }, 'Duplicate event — notification already sent, skipping');
    return;
  }

  await mailer.send({ to: params.to, subject: params.subject, body: params.body });

  try {
    await NotificationModel.create({
      eventId: params.eventId,
      type: params.type,
      to: params.to,
      subject: params.subject,
      body: params.body,
      relatedId: params.relatedId ?? null,
      status: 'sent',
    });
  } catch (err) {
    // 11000 = duplicate key: another delivery won the race; safe to ignore.
    if ((err as { code?: number }).code === 11000) return;
    throw err;
  }
}

export const notificationService = {
  async onUserRegistered(data: UserRegisteredData, eventId: string): Promise<void> {
    await deliver({
      eventId,
      type: 'user.registered',
      to: data.email,
      subject: 'Welcome to the shop!',
      body: `Hi ${data.name}, thanks for creating an account.`,
      relatedId: data.userId,
    });
  },

  async onOrderCreated(data: OrderCreatedData, eventId: string): Promise<void> {
    // Remember the contact email for later payment events.
    await OrderContactModel.updateOne(
      { orderId: data.orderId },
      { $set: { email: data.email } },
      { upsert: true },
    );

    const lines = data.items.map((i) => `  - ${i.quantity} × ${i.name}`).join('\n');
    await deliver({
      eventId,
      type: 'order.created',
      to: data.email,
      subject: `Order received (${data.orderId})`,
      body: `We've received your order:\n${lines}\nTotal: ${money(data.totalAmount, data.currency)}\nWe'll email you once payment is confirmed.`,
      relatedId: data.orderId,
    });
  },

  async onPaymentSucceeded(data: PaymentSucceededData, eventId: string): Promise<void> {
    const email = await this.lookupEmail(data.orderId);
    if (!email) return;
    await deliver({
      eventId,
      type: 'payment.succeeded',
      to: email,
      subject: `Payment confirmed (${data.orderId})`,
      body: `Your payment of ${money(data.amount, data.currency)} was successful. Your order is now being processed.`,
      relatedId: data.orderId,
    });
  },

  async onPaymentFailed(data: PaymentFailedData, eventId: string): Promise<void> {
    const email = await this.lookupEmail(data.orderId);
    if (!email) return;
    await deliver({
      eventId,
      type: 'payment.failed',
      to: email,
      subject: `Payment problem (${data.orderId})`,
      body: `We couldn't process your payment: ${data.reason}. Please try again.`,
      relatedId: data.orderId,
    });
  },

  async lookupEmail(orderId: string): Promise<string | null> {
    const contact = await OrderContactModel.findOne({ orderId });
    if (!contact) {
      log.warn({ orderId }, 'No contact email known for order — cannot notify');
      return null;
    }
    return contact.email as string;
  },

  listByEmail(email: string) {
    return NotificationModel.find({ to: email }).sort({ createdAt: -1 }).limit(100);
  },
};
