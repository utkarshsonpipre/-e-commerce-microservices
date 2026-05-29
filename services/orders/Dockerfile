# Build context is the repository root (see docker-compose.yml).
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY services ./services
RUN npm ci
RUN npm run build -w @ecommerce/common && npm run build -w @ecommerce/orders

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/orders ./services/orders
EXPOSE 3003
CMD ["node", "services/orders/dist/index.js"]
