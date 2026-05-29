import { EventType } from '@ecommerce/common';
import { bus } from '../bus';
import { orderService } from '../../services/order.service';

/**
 * Subscribe the orders service to payment outcomes. This closes the saga:
 * payments reports the result, orders updates state accordingly.
 */
export async function registerPaymentConsumers(): Promise<void> {
  await bus.subscribe(
    'orders.payment-events',
    [EventType.PaymentSucceeded, EventType.PaymentFailed],
    async (data, envelope) => {
      if (envelope.type === EventType.PaymentSucceeded) {
        const payload = data as { orderId: string; paymentId: string };
        await orderService.markPaid(payload.orderId, payload.paymentId);
      } else if (envelope.type === EventType.PaymentFailed) {
        const payload = data as { orderId: string; reason: string };
        await orderService.markFailed(payload.orderId, payload.reason);
      }
    },
  );
}
