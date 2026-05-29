// Runs before any module is imported so config.ts (requireEnv) sees these.
process.env.JWT_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://placeholder/test'; // real URI comes from mongodb-memory-server
process.env.INTERNAL_API_KEY = 'test-internal-key';
process.env.CATALOG_SERVICE_URL = 'http://catalog.test';
