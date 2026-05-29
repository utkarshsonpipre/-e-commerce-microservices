import { createLogger } from '@ecommerce/common';
import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './db';
import { bus } from './events/bus';
import { registerPaymentConsumers } from './events/consumers/payment.consumer';

const log = createLogger('orders');

async function main(): Promise<void> {
  await connectDatabase(config.mongoUri);
  await bus.connect();
  await registerPaymentConsumers();

  const app = createApp();
  const server = app.listen(config.port, () => {
    log.info(`orders service listening on :${config.port}`);
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
