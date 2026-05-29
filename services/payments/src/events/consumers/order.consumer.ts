import { EventType, OrderCreatedData } from '@ecommerce/common';
import { bus } from '../bus';
import { paymentService } from '../../services/payment.service';

/** Subscribe payments to order.created so it can create a PaymentIntent. */
export async function registerOrderConsumers(): Promise<void> {
  await bus.subscribe('payments.order-events', [EventType.OrderCreated], async (data) => {
    await paymentService.handleOrderCreated(data as OrderCreatedData);
  });
}
