import { RequestHandler } from 'express';
import { createLogger } from '@ecommerce/common';
import { paymentService } from '../services/payment.service';
import { paymentGateway } from '../stripe/gateway';

const log = createLogger('payments:webhook');

export const paymentController = {
  /**
   * Stripe webhook endpoint. The raw body (a Buffer) is required for signature
   * verification, so this route is mounted with express.raw() before the JSON
   * parser. We ACK Stripe with 200 quickly even on handler errors that aren't
   * signature failures, to avoid unnecessary retries for already-processed events.
   */
  webhook: (async (req, res) => {
    const signature = req.headers['stripe-signature'] as string | undefined;
    // req.body is a Buffer here (express.raw).
    const event = paymentGateway.constructEvent(req.body as Buffer, signature);
    log.info({ type: event.type, id: event.id }, 'Received Stripe webhook');
    await paymentService.handleWebhookEvent(event);
    res.json({ received: true });
  }) as RequestHandler,

  /** Fetch payment status + client secret for an order (used by the client). */
  getByOrder: (async (req, res) => {
    const payment = await paymentService.getByOrder(req.user!.id, req.params.orderId);
    res.json({
      payment: {
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        clientSecret: payment.clientSecret,
      },
    });
  }) as RequestHandler,
};
