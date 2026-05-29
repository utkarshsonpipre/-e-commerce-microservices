import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

// The bus talks to RabbitMQ, which isn't available in unit tests — mock it.
jest.mock('../events/bus', () => ({
  bus: {
    publish: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  },
}));

import { createApp } from '../app';
import { bus } from '../events/bus';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  jest.clearAllMocks();
});

const validUser = { email: 'alice@example.com', password: 'password123', name: 'Alice' };

describe('POST /auth/register', () => {
  it('creates a user, returns tokens, and publishes user.registered', async () => {
    const res = await request(app).post('/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: validUser.email, name: 'Alice', role: 'customer' });
    expect(res.body.user.id).toBeDefined();
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(bus.publish).toHaveBeenCalledWith('user.registered', expect.objectContaining({ email: validUser.email }));
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app).post('/auth/register').send({ ...validUser, password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: validUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const reg = await request(app).post('/auth/register').send(validUser);
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('rejects requests without a token with 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('issues new tokens from a valid refresh token', async () => {
    const reg = await request(app).post('/auth/register').send(validUser);
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });
});
