/**
 * Cross-service event contracts. This is the single source of truth for what
 * flows over RabbitMQ — every publisher and consumer imports these types so
 * the message shapes can never silently drift apart.
 */

/** Event names double as RabbitMQ topic routing keys. */
export enum EventType {
  UserRegistered = 'user.registered',
  OrderCreated = 'order.created',
  PaymentSucceeded = 'payment.succeeded',
  PaymentFailed = 'payment.failed',
}

/** Envelope wrapping every published message. */
export interface EventEnvelope<T = unknown> {
  /** Unique id of this event — consumers use it for idempotency. */
  id: string;
  type: EventType;
  /** ISO timestamp of when the event occurred. */
  occurredAt: string;
  data: T;
}

// ── Payloads ───────────────────────────────────────────────────────────────

export interface UserRegisteredData {
  userId: string;
  email: string;
  name: string;
}

export interface OrderLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // in minor units (e.g. cents)
}

export interface OrderCreatedData {
  orderId: string;
  userId: string;
  email: string;
  items: OrderLineItem[];
  totalAmount: number; // minor units
  currency: string; // ISO 4217, e.g. "usd"
}

export interface PaymentSucceededData {
  orderId: string;
  paymentId: string;
  amount: number; // minor units
  currency: string;
}

export interface PaymentFailedData {
  orderId: string;
  paymentId?: string;
  reason: string;
}

/** Maps each event type to its payload type for end-to-end type safety. */
export interface EventDataMap {
  [EventType.UserRegistered]: UserRegisteredData;
  [EventType.OrderCreated]: OrderCreatedData;
  [EventType.PaymentSucceeded]: PaymentSucceededData;
  [EventType.PaymentFailed]: PaymentFailedData;
}
