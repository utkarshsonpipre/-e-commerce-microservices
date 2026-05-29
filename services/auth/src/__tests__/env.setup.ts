// Runs before any module is imported so config.ts (requireEnv) sees these.
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '7d';
process.env.MONGO_URI = 'mongodb://placeholder/test'; // real URI comes from mongodb-memory-server
process.env.BCRYPT_ROUNDS = '4'; // faster hashing in tests
