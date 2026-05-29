// Runs before any module is imported so config.ts (requireEnv) sees these.
process.env.MONGO_URI = 'mongodb://placeholder/test'; // real URI comes from mongodb-memory-server
process.env.MAIL_TRANSPORT = 'log';
