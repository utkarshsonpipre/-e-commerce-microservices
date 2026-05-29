// API client for the e-commerce gateway.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  stock: number;
}
export interface CartItem {
  productId: string;
  quantity: number;
}
export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}
export interface Order {
  id: string;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentId?: string | null;
  createdAt: string;
}
export interface Notification {
  type: string;
  subject: string;
  body: string;
  createdAt: string;
}

let token: string | null = localStorage.getItem('token');

export function getToken(): string | null {
  return token;
}
export function setToken(t: string | null): void {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

async function http<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth && token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  base: BASE,

  // ── auth ──
  register: (email: string, password: string, name: string) =>
    http<{ user: User; accessToken: string }>('POST', '/api/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    http<{ user: User; accessToken: string }>('POST', '/api/auth/login', { email, password }),

  // ── catalog ──
  getProducts: () => http<{ items: Product[] }>('GET', '/api/products'),

  // ── cart ──
  getCart: () => http<{ cart: { items: CartItem[] } }>('GET', '/api/cart', undefined, true),
  addToCart: (productId: string, quantity: number) =>
    http<{ cart: { items: CartItem[] } }>('POST', '/api/cart/items', { productId, quantity }, true),
  clearCart: () => http<void>('DELETE', '/api/cart', undefined, true),

  // ── orders ──
  placeOrder: () => http<{ order: Order }>('POST', '/api/orders', {}, true),
  getOrders: () => http<{ orders: Order[] }>('GET', '/api/orders', undefined, true),
  getOrder: (id: string) => http<{ order: Order }>('GET', `/api/orders/${id}`, undefined, true),

  // ── payments ──
  getPayment: (orderId: string) =>
    http<{ payment: { status: string; clientSecret: string; amount: number; currency: string } }>(
      'GET',
      `/api/payments/order/${orderId}`,
      undefined,
      true,
    ),

  // ── notifications ──
  getNotifications: (email: string) =>
    http<{ notifications: Notification[] }>('GET', `/api/notifications?email=${encodeURIComponent(email)}`),

  /**
   * Demo helper (stub mode): simulate Stripe firing the payment webhook.
   * Looks up the order's PaymentIntent and posts a fake signed-less event.
   */
  async simulatePayment(orderId: string, succeed: boolean): Promise<void> {
    // The payment record is created asynchronously after order.created — retry briefly.
    let clientSecret = '';
    for (let i = 0; i < 5 && !clientSecret; i++) {
      try {
        const { payment } = await this.getPayment(orderId);
        clientSecret = payment.clientSecret;
      } catch {
        await new Promise((r) => setTimeout(r, 700));
      }
    }
    if (!clientSecret) throw new Error('Payment not initialized yet — try again in a moment');

    const intentId = clientSecret.replace(/_secret_mock$/, '');
    const event = succeed
      ? { id: 'evt_ui', type: 'payment_intent.succeeded', data: { object: { id: intentId } } }
      : {
          id: 'evt_ui',
          type: 'payment_intent.payment_failed',
          data: { object: { id: intentId, last_payment_error: { message: 'Card declined (simulated)' } } },
        };

    await http('POST', '/webhooks/stripe', event);
  },
};
