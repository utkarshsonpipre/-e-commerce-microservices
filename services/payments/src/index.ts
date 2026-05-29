import { createLogger } from '@ecommerce/common';
import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './db';
import { bus } from './events/bus';
import { registerOrderConsumers } from './events/consumers/order.consumer';

const log = createLogger('payments');

async function main(): Promise<void> {
  if (!config.stripeEnabled) {
    log.warn('STRIPE_SECRET_KEY not configured — running with the STUB payment gateway');
  }

  await connectDatabase(config.mongoUri);
  await bus.connect();
  await registerOrderConsumers();

  const app = createApp();
  const server = app.listen(config.port, () => {
    log.info(`payments service listening on :${config.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'Shutting down');
    server.close();
    await bus.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  log.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
