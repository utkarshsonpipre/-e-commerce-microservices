import request from 'supertest';
import { signAccessToken } from '@ecommerce/common';
import { createApp } from '../app';

const app = createApp();

describe('gateway routing & auth', () => {
  it('serves a health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('gateway');
  });

  it('lists routes at the root', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.routes).toContain('/api/orders');
  });

  it('rejects protected routes without a token (before proxying upstream)', async () => {
    const res = await request(app).post('/api/orders');
    expect(res.status).toBe(401);
  });

  it('rejects protected routes with an invalid token', async () => {
    const res = await request(app).get('/api/cart').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('passes auth at the gateway with a valid token (upstream then unavailable → 502)', async () => {
    const token = signAccessToken({ sub: 'u1', email: 'u1@shop.test', role: 'customer' });
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);
    // Auth passed at the gateway; the (non-existent) upstream yields a 502.
    expect(res.status).toBe(502);
  });
});
