import { createLogger } from '@ecommerce/common';
import { createApp } from './app';
import { config } from './config';

const log = createLogger('gateway');

const app = createApp();
const server = app.listen(config.port, () => {
  log.info(`API gateway listening on :${config.port}`);
});

const shutdown = (signal: string): void => {
  log.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
