// Runs before any module is imported so config.ts sees these.
// No STRIPE_SECRET_KEY → the service runs with the stub gateway (perfect for tests).
process.env.JWT_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://placeholder/test'; // real URI comes from mongodb-memory-server
