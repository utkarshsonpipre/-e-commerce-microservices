import { AppError, ConflictError } from '@ecommerce/common';
import { config } from '../config';

export interface StockLine {
  productId: string;
  quantity: number;
}

export interface ReservedLine {
  productId: string;
  name: string;
  unitPrice: number;
  currency: string;
  quantity: number;
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.catalogUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-api-key': config.internalApiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const message = (detail as { error?: { message?: string } })?.error?.message ?? 'Catalog request failed';
    // 409 from catalog means out-of-stock — surface it as a client-facing conflict.
    if (res.status === 409) throw new ConflictError(message);
    throw new AppError(`Catalog service error: ${message}`, 502);
  }
  return res.json() as Promise<T>;
}

/**
 * Synchronous REST call to the catalog service. Reserves stock and returns the
 * authoritative price/name for each line so the order can't be tampered with
 * from the client side.
 */
export const catalogClient = {
  async reserveStock(items: StockLine[]): Promise<ReservedLine[]> {
    const data = await call<{ reserved: ReservedLine[] }>('/internal/reserve-stock', { items });
    return data.reserved;
  },

  async releaseStock(items: StockLine[]): Promise<void> {
    await call('/internal/release-stock', { items });
  },
};
