import {
  EventType,
  OrderCreatedData,
  PaymentFailedData,
  PaymentSucceededData,
  UserRegisteredData,
} from '@ecommerce/common';
import { bus } from '../bus';
import { notificationService } from '../../services/notification.service';

/**
 * Notifications is a pure consumer: one durable queue bound to every event type
 * it cares about. The handler dispatches by event type and uses the envelope id
 * for idempotency.
 */
export async function registerConsumers(): Promise<void> {
  await bus.subscribe(
    'notifications.events',
    [EventType.UserRegistered, EventType.OrderCreated, EventType.PaymentSucceeded, EventType.PaymentFailed],
    async (data, envelope) => {
      switch (envelope.type) {
        case EventType.UserRegistered:
          await notificationService.onUserRegistered(data as UserRegisteredData, envelope.id);
          break;
        case EventType.OrderCreated:
          await notificationService.onOrderCreated(data as OrderCreatedData, envelope.id);
          break;
        case EventType.PaymentSucceeded:
          await notificationService.onPaymentSucceeded(data as PaymentSucceededData, envelope.id);
          break;
        case EventType.PaymentFailed:
          await notificationService.onPaymentFailed(data as PaymentFailedData, envelope.id);
          break;
      }
    },
  );
}
