import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { AppError, createLogger } from '@ecommerce/common';
import { config } from '../config';

const log = createLogger('payments:stripe');

export interface CreateIntentArgs {
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface IntentResult {
  id: string;
  clientSecret: string;
  status: string;
}

/** Minimal shape of the Stripe webhook events we handle. */
export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, string>;
      last_payment_error?: { message?: string } | null;
    };
  };
}

export interface PaymentGateway {
  createPaymentIntent(args: CreateIntentArgs): Promise<IntentResult>;
  /** Verify + parse a webhook payload. Throws if the signature is invalid. */
  constructEvent(payload: Buffer, signature: string | undefined): WebhookEvent;
}

/** Real Stripe-backed gateway. */
class StripeGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.stripeSecretKey, { apiVersion: '2024-06-20' });
  }

  async createPaymentIntent(args: CreateIntentArgs): Promise<IntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: args.amount,
      currency: args.currency,
      metadata: args.metadata,
      automatic_payment_methods: { enabled: true },
    });
    return { id: intent.id, clientSecret: intent.client_secret ?? '', status: intent.status };
  }

  constructEvent(payload: Buffer, signature: string | undefined): WebhookEvent {
    if (!signature) throw new AppError('Missing Stripe-Signature header', 400);
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, config.stripeWebhookSecret);
      return event as unknown as WebhookEvent;
    } catch (err) {
      throw new AppError(`Webhook signature verification failed: ${String(err)}`, 400);
    }
  }
}

/**
 * Stub gateway used when no real Stripe key is configured. It fabricates
 * PaymentIntents and accepts unsigned webhook payloads so the platform can be
 * driven end-to-end locally (e.g. POST a fake `payment_intent.succeeded`).
 */
class StubGateway implements PaymentGateway {
  async createPaymentIntent(_args: CreateIntentArgs): Promise<IntentResult> {
    const id = `pi_mock_${randomUUID().replace(/-/g, '')}`;
    log.warn({ id }, 'Stripe not configured — created MOCK PaymentIntent');
    return { id, clientSecret: `${id}_secret_mock`, status: 'requires_payment_method' };
  }

  constructEvent(payload: Buffer, _signature: string | undefined): WebhookEvent {
    log.warn('Stripe not configured — accepting UNVERIFIED webhook payload');
    return JSON.parse(payload.toString()) as WebhookEvent;
  }
}

export const paymentGateway: PaymentGateway = config.stripeEnabled
  ? new StripeGateway()
  : new StubGateway();
