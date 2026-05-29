import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';
import { optionalEnv } from './env';
import { EventDataMap, EventEnvelope, EventType } from './events';
import { createLogger } from './logger';

const log = createLogger('rabbitmq');

// amqplib's exported types differ slightly across 0.10.x patch releases, so we
// derive them from the connect() return type to stay version-agnostic.
type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection['createChannel']>>;

export type EventHandler<T extends EventType> = (
  data: EventDataMap[T],
  envelope: EventEnvelope<EventDataMap[T]>,
) => Promise<void>;

interface Subscription {
  queue: string;
  types: EventType[];
  prefetch: number;
  // handler is type-erased internally; the public subscribe() keeps it typed.
  handler: (data: unknown, envelope: EventEnvelope) => Promise<void>;
}

export interface RabbitMQOptions {
  url?: string;
  exchange?: string;
}

/**
 * Thin RabbitMQ client over a single topic exchange.
 *
 * - publish(type, data) routes by event type (the routing key).
 * - subscribe(queue, types, handler) binds a durable queue to those types.
 * - Failed messages are dead-lettered to `<exchange>.dlx` (no infinite requeue).
 * - Reconnects automatically and replays subscriptions on connection loss.
 */
export class RabbitMQClient {
  private readonly url: string;
  private readonly exchange: string;
  private readonly dlx: string;

  private connection?: Connection;
  private channel?: Channel;
  private connectingPromise?: Promise<void>;
  private intentionallyClosed = false;
  private readonly subscriptions: Subscription[] = [];

  constructor(options: RabbitMQOptions = {}) {
    this.url = options.url ?? optionalEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
    this.exchange = options.exchange ?? optionalEnv('RABBITMQ_EXCHANGE', 'ecommerce');
    this.dlx = `${this.exchange}.dlx`;
  }

  /** Connect (with retry) and declare the exchanges. Idempotent. */
  async connect(retries = 10, delayMs = 3000): Promise<void> {
    if (this.channel) return;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = this.doConnect(retries, delayMs).finally(() => {
      this.connectingPromise = undefined;
    });
    return this.connectingPromise;
  }

  private async doConnect(retries: number, delayMs: number): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const connection = await amqp.connect(this.url);
        const channel = await connection.createChannel();
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
        await channel.assertExchange(this.dlx, 'topic', { durable: true });

        connection.on('error', (err) => log.error({ err }, 'RabbitMQ connection error'));
        connection.on('close', () => this.handleClose());

        this.connection = connection;
        this.channel = channel;
        this.intentionallyClosed = false;
        log.info({ exchange: this.exchange }, 'Connected to RabbitMQ');

        await this.replaySubscriptions();
        return;
      } catch (err) {
        lastError = err;
        log.warn({ attempt, retries }, 'RabbitMQ connection failed, retrying...');
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(`Could not connect to RabbitMQ after ${retries} attempts: ${String(lastError)}`);
  }

  private handleClose(): void {
    this.channel = undefined;
    this.connection = undefined;
    if (this.intentionallyClosed) return;
    log.warn('RabbitMQ connection closed, reconnecting...');
    void this.connect().catch((err) => log.error({ err }, 'RabbitMQ reconnect failed'));
  }

  private async ensureChannel(): Promise<Channel> {
    if (!this.channel) await this.connect();
    if (!this.channel) throw new Error('RabbitMQ channel unavailable');
    return this.channel;
  }

  /** Publish a typed event. Messages are persistent. */
  async publish<T extends EventType>(type: T, data: EventDataMap[T]): Promise<void> {
    const channel = await this.ensureChannel();
    const envelope: EventEnvelope<EventDataMap[T]> = {
      id: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      data,
    };
    channel.publish(this.exchange, type, Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
      contentType: 'application/json',
      messageId: envelope.id,
      type,
    });
    log.debug({ type, id: envelope.id }, 'Published event');
  }

  /**
   * Subscribe a durable queue to one or more event types. The handler is acked
   * on success; on throw the message is dead-lettered (not requeued forever).
   */
  async subscribe<T extends EventType>(
    queue: string,
    types: T[],
    handler: EventHandler<T>,
    opts: { prefetch?: number } = {},
  ): Promise<void> {
    const subscription: Subscription = {
      queue,
      types,
      prefetch: opts.prefetch ?? 10,
      handler: handler as Subscription['handler'],
    };
    this.subscriptions.push(subscription);
    await this.applySubscription(subscription);
  }

  private async replaySubscriptions(): Promise<void> {
    for (const subscription of this.subscriptions) {
      await this.applySubscription(subscription);
    }
  }

  private async applySubscription(sub: Subscription): Promise<void> {
    const channel = await this.ensureChannel();
    const deadLetterQueue = `${sub.queue}.dlq`;

    await channel.assertQueue(sub.queue, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': this.dlx },
    });
    await channel.assertQueue(deadLetterQueue, { durable: true });

    for (const type of sub.types) {
      await channel.bindQueue(sub.queue, this.exchange, type);
      await channel.bindQueue(deadLetterQueue, this.dlx, type);
    }

    await channel.prefetch(sub.prefetch);
    await channel.consume(sub.queue, (msg) => {
      if (!msg) return;
      void this.handleMessage(channel, sub, msg);
    });

    log.info({ queue: sub.queue, types: sub.types }, 'Subscribed');
  }

  private async handleMessage(
    channel: Channel,
    sub: Subscription,
    msg: amqp.ConsumeMessage,
  ): Promise<void> {
    try {
      const envelope = JSON.parse(msg.content.toString()) as EventEnvelope;
      await sub.handler(envelope.data, envelope);
      channel.ack(msg);
    } catch (err) {
      log.error({ err, queue: sub.queue }, 'Handler failed, dead-lettering message');
      // requeue=false → routed to the dead-letter exchange for inspection.
      channel.nack(msg, false, false);
    }
  }

  async close(): Promise<void> {
    this.intentionallyClosed = true;
    try {
      await this.channel?.close();
      await this.connection?.close();
    } finally {
      this.channel = undefined;
      this.connection = undefined;
    }
  }
}

/** Convenience factory using environment defaults. */
export function createRabbitClient(options?: RabbitMQOptions): RabbitMQClient {
  return new RabbitMQClient(options);
}
