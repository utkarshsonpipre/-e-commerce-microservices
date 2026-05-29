import {
  EventType,
  ForbiddenError,
  NotFoundError,
  OrderCreatedData,
  createLogger,
} from '@ecommerce/common';
import { bus } from '../events/bus';
import { PaymentDocument, PaymentModel } from '../models/payment.model';
import { WebhookEvent, paymentGateway } from '../stripe/gateway';

const log = createLogger('payments:service');

export const paymentService = {
  /**
   * React to `order.created`: create a Stripe PaymentIntent and store a pending
   * payment. Idempotent — a duplicate event for the same order is ignored.
   */
  async handleOrderCreated(data: OrderCreatedData): Promise<void> {
    const existing = await PaymentModel.findOne({ orderId: data.orderId });
    if (existing) {
      log.warn({ orderId: data.orderId }, 'Payment already exists for order — skipping');
      return;
    }

    const intent = await paymentGateway.createPaymentIntent({
      amount: data.totalAmount,
      currency: data.currency,
      metadata: { orderId: data.orderId, userId: data.userId },
    });

    await PaymentModel.create({
      orderId: data.orderId,
      userId: data.userId,
      email: data.email,
      amount: data.totalAmount,
      currency: data.currency,
      status: 'pending',
      providerPaymentId: intent.id,
      clientSecret: intent.clientSecret,
    });

    log.info({ orderId: data.orderId, intentId: intent.id }, 'PaymentIntent created for order');
  },

  /**
   * Handle a verified Stripe webhook. This is the source of truth for payment
   * outcome — never the client. Publishes payment.succeeded / payment.failed.
   */
  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    const intentId = event.data.object.id;
    const payment = await PaymentModel.findOne({ providerPaymentId: intentId });
    if (!payment) {
      log.warn({ intentId, type: event.type }, 'No payment found for webhook event');
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.markSucceeded(payment);
        break;
      case 'payment_intent.payment_failed':
        await this.markFailed(payment, event.data.object.last_payment_error?.message ?? 'Payment failed');
        break;
      default:
        log.debug({ type: event.type }, 'Ignoring unhandled webhook event type');
    }
  },

  async markSucceeded(payment: PaymentDocument): Promise<void> {
    if (payment.status === 'succeeded') return; // idempotent
    payment.status = 'succeeded';
    await payment.save();
    await bus.publish(EventType.PaymentSucceeded, {
      orderId: payment.orderId,
      paymentId: payment.providerPaymentId,
      amount: payment.amount,
      currency: payment.currency,
    });
    log.info({ orderId: payment.orderId }, 'Payment succeeded');
  },

  async markFailed(payment: PaymentDocument, reason: string): Promise<void> {
    if (payment.status === 'failed') return; // idempotent
    payment.status = 'failed';
    payment.failureReason = reason;
    await payment.save();
    await bus.publish(EventType.PaymentFailed, {
      orderId: payment.orderId,
      paymentId: payment.providerPaymentId,
      reason,
    });
    log.info({ orderId: payment.orderId, reason }, 'Payment failed');
  },

  async getByOrder(userId: string, orderId: string): Promise<PaymentDocument> {
    const payment = await PaymentModel.findOne({ orderId });
    if (!payment) throw new NotFoundError('Payment not found for order');
    if (payment.userId !== userId) throw new ForbiddenError('Not your payment');
    return payment;
  },
};
