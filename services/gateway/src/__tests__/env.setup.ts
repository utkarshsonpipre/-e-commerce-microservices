// Runs before any module is imported.
process.env.JWT_SECRET = 'test-secret';

// Point upstreams at a dead port so the proxy fails deterministically (→ 502),
// independent of whether the real Docker services happen to be running locally.
const DEAD = 'http://127.0.0.1:59999';
process.env.AUTH_SERVICE_URL = DEAD;
process.env.CATALOG_SERVICE_URL = DEAD;
process.env.ORDERS_SERVICE_URL = DEAD;
process.env.PAYMENTS_SERVICE_URL = DEAD;
process.env.NOTIFICATIONS_SERVICE_URL = DEAD;
