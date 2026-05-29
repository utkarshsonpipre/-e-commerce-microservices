import { createRabbitClient } from '@ecommerce/common';
import { config } from '../config';

/** Shared message-bus client for this service. Connected during boot. */
export const bus = createRabbitClient({ url: config.rabbitUrl });
