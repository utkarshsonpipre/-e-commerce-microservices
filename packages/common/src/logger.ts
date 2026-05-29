import pino, { Logger } from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';

/**
 * Root logger. Emits structured JSON so logs can be parsed/traced across
 * services. Set LOG_LEVEL=debug for verbose output.
 */
export const logger: Logger = pino({
  level,
  base: undefined, // drop pid/hostname noise; we add { service } via child loggers
  timestamp: pino.stdTimeFunctions.isoTime,
});

/** Create a child logger tagged with the service name. */
export function createLogger(service: string): Logger {
  return logger.child({ service });
}
