import {
  BadRequestError,
  EventType,
  ForbiddenError,
  NotFoundError,
  createLogger,
} from '@ecommerce/common';
import { catalogClient, StockLine } from '../clients/catalog.client';
import { bus } from '../events/bus';
import { OrderDocument, OrderModel } from '../models/order.model';

const log = createLogger('orders:service');

export interface CheckoutUser {
  id: string;
  email: string;
}

export const orderService = {
  /**
   * Checkout = the start of the saga.
   * 1. Reserve stock in the catalog (synchronous; fail fast).
   * 2. Persist the order as `pending_payment`.
   * 3. Publish `order.created` so payments and notifications can react.
   *
   * If persisting/publishing fails after stock was reserved, we compensate by
   * releasing the reservation so inventory stays consistent.
   */
  async checkout(user: CheckoutUser, items: StockLine[]): Promise<OrderDocument> {
    if (items.length === 0) throw new BadRequestError('Cannot create an order with no items');

    const reserved = await catalogClient.reserveStock(items);
    const stockLines: StockLine[] = reserved.map((r) => ({ productId: r.productId, quantity: r.quantity }));

    try {
      const totalAmount = reserved.reduce((sum, r) => sum + r.unitPrice * r.quantity, 0);
      const currency = reserved[0]?.currency ?? 'usd';

      const order = await OrderModel.create({
        userId: user.id,
        email: user.email,
        items: reserved.map((r) => ({
          productId: r.productId,
          name: r.name,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
        })),
        totalAmount,
        currency,
        status: 'pending_payment',
      });

      await bus.publish(EventType.OrderCreated, {
        orderId: order.id,
        userId: user.id,
        email: user.email,
        items: order.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        totalAmount,
        currency,
      });

      log.info({ orderId: order.id, totalAmount, currency }, 'Order created');
      return order;
    } catch (err) {
      log.error({ err }, 'Order creation failed after stock reservation — compensating');
      await catalogClient.releaseStock(stockLines).catch((releaseErr) => {
        log.error({ releaseErr }, 'Compensating stock release failed');
      });
      throw err;
    }
  },

  async listByUser(userId: string): Promise<OrderDocument[]> {
    return OrderModel.find({ userId }).sort({ createdAt: -1 });
  },

  async getForUser(userId: string, orderId: string): Promise<OrderDocument> {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new ForbiddenError('Not your order');
    return order;
  },

  /**
   * Payment succeeded — mark the order paid. Idempotent: the status filter
   * means a duplicate event is a no-op (RabbitMQ delivers at-least-once).
   */
  async markPaid(orderId: string, paymentId: string): Promise<void> {
    const updated = await OrderModel.findOneAndUpdate(
      { _id: orderId, status: 'pending_payment' },
      { $set: { status: 'paid', paymentId } },
      { new: true },
    );
    if (updated) {
      log.info({ orderId, paymentId }, 'Order marked paid');
    } else {
      log.warn({ orderId }, 'markPaid no-op (order not pending or not found)');
    }
  },

  /**
   * Payment failed — mark the order failed and release the reserved stock.
   * Idempotent on the pending_payment status.
   */
  async markFailed(orderId: string, reason: string): Promise<void> {
    const order = await OrderModel.findOne({ _id: orderId, status: 'pending_payment' });
    if (!order) {
      log.warn({ orderId }, 'markFailed no-op (order not pending or not found)');
      return;
    }
    order.status = 'failed';
    await order.save();
    await catalogClient.releaseStock(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );
    log.info({ orderId, reason }, 'Order marked failed and stock released');
  },
};
