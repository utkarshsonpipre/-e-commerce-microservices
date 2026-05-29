import mongoose from 'mongoose';
import { createLogger } from '@ecommerce/common';

const log = createLogger('catalog:db');

export async function connectDatabase(uri: string, retries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri);
      log.info('Connected to MongoDB');
      return;
    } catch (err) {
      log.warn({ attempt, retries }, 'MongoDB connection failed, retrying...');
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
