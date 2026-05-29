# E-Commerce Microservices Platform

A production-style e-commerce backend built as independent microservices, demonstrating the architectural patterns most commonly probed in interviews: **synchronous REST + asynchronous messaging**, **database-per-service**, **JWT auth across services**, a **Stripe payment integration with webhook verification**, and a **saga-style checkout flow**.

## Architecture

```
Client → API Gateway (:3000)  ──routing, rate-limit, JWT pre-check──┐
                                                                     │
        ┌──────────────┬──────────────┬──────────────┬──────────────┤
   auth (:3001)  catalog (:3002)  orders (:3003)  payments (:3004)  notifications (:3005)
        │              │              │              │              │
     auth_db       catalog_db     order_db      payments_db   notifications_db
        └──────────────┴──────┬───────┴──────────────┴──────────────┘
                              RabbitMQ (topic exchange + management UI :15672)
                                          │
                                  Stripe (external, webhook → payments)
```

### Services

| Service | Port | Owns | Emits | Consumes |
|---------|------|------|-------|----------|
| **gateway** | 3000 | — (reverse proxy) | — | — |
| **auth** | 3001 | users, credentials, refresh tokens | `user.registered` | — |
| **product-catalog** | 3002 | products, categories, stock | — | — |
| **orders** | 3003 | carts, orders | `order.created` | `payment.succeeded`, `payment.failed` |
| **payments** | 3004 | payment intents, transactions | `payment.succeeded`, `payment.failed` | `order.created` |
| **notifications** | 3005 | notification log | — | `user.registered`, `order.created`, `payment.*` |

### Communication
- **Synchronous REST** when a caller needs an answer now (orders → catalog to validate price & reserve stock).
- **Asynchronous events over RabbitMQ** (topic exchange `ecommerce`) when a service just announces a fact and doesn't care who reacts.

### The checkout saga
1. Client → `orders POST /orders` (cart, JWT).
2. orders → catalog `reserve-stock` **(sync)** — fail fast if out of stock.
3. orders saves the order as `pending_payment` and publishes `order.created`.
4. **payments** consumes `order.created` → creates a Stripe PaymentIntent.
   **notifications** consumes it → sends an "order received" email.
5. Customer pays via Stripe.
6. Stripe → `payments POST /webhooks/stripe` (**signature-verified** — the source of truth).
7. payments publishes `payment.succeeded` / `payment.failed`.
8. orders consumes it → marks order `paid` (or `failed` + releases stock).
   notifications consumes it → sends a receipt (or a payment-problem email).

> **Why the webhook is the source of truth:** the customer can close the tab mid-payment. Stripe always reports the real outcome via webhook, so payment state never depends on the browser.

## Design notes / tradeoffs
- **Database-per-service:** each service owns its own logical MongoDB database and never touches another's collections. For this demo all databases live in **one MongoDB container** (`auth_db`, `catalog_db`, …) to save RAM — splitting into separate clusters later is a config change, not a code change.
- **Shared `packages/common`:** JWT, the auth middleware, the RabbitMQ client, and the typed event contracts live in one place so cross-service contracts can't silently drift. Domain logic stays inside each service.
- **Idempotent consumers:** RabbitMQ delivers at-least-once, so event handlers tolerate duplicates.
- **JWT verified locally:** every service verifies tokens itself (shared secret) instead of calling auth on each request.

## Tech stack
Node.js · TypeScript · Express · MongoDB (Mongoose) · RabbitMQ (amqplib) · Stripe · JWT · Jest · Docker Compose · GitHub Actions.

## Getting started

### Prerequisites
- Docker + Docker Compose
- (For local, non-Docker dev) Node.js ≥ 20

### Run everything with Docker
```bash
cp .env.example .env        # then drop in your Stripe test keys
docker compose up --build
```
- **Storefront (web UI): http://localhost:8081**  ← open this to click through the whole flow
- Gateway (API): http://localhost:8080  (host 8080 → gateway container's port 3000)
- RabbitMQ management UI: http://localhost:15672 (guest / guest)

The storefront is a React + Vite SPA (in `frontend/`) that drives the full journey:
register/login → browse seeded products → cart → place order → **simulate payment
success/failure** (stub mode) → watch the order status settle and notifications arrive.
The catalog seeds sample products on first startup.

### Local development (hot reload, infra in Docker)
```bash
npm install
docker compose up -d mongodb rabbitmq   # just the infrastructure
npm run dev                              # runs all 6 node services with tsx watch
```

### Stripe webhooks in local dev
```bash
stripe listen --forward-to localhost:3004/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET in .env
```

## Useful scripts
| Command | What it does |
|---------|--------------|
| `npm run build` | Compile common, then every service |
| `npm run lint` | ESLint across all services |
| `npm test` | Run every service's test suite |
| `npm run typecheck` | Type-check the whole monorepo |
| `npm run dev` | Run all services locally with hot reload |

## Repository layout
```
packages/common        shared library (JWT, auth middleware, MQ client, event contracts, errors, logger)
services/
  gateway              API gateway / reverse proxy
  auth                 authentication & users
  product-catalog      products, categories, stock
  orders               carts, orders, checkout saga coordinator
  payments             Stripe integration & webhooks
  notifications        event-driven email/notification log
frontend               React + Vite storefront (web UI, served by nginx)
.github/workflows      CI pipeline (lint → test → build → deploy)
```

## CI/CD
GitHub Actions (`.github/workflows/ci.yml`) runs **lint → test → build** on every push/PR, with a `deploy` stage gated on `main`.
