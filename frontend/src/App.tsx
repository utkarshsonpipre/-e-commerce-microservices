import { useCallback, useEffect, useState } from 'react';
import {
  api,
  setToken,
  type User,
  type Product,
  type CartItem,
  type Order,
  type Notification,
} from './api';

function money(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'badge-amber',
  paid: 'badge-green',
  failed: 'badge-red',
  cancelled: 'badge-gray',
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  const refreshProducts = useCallback(async () => {
    setProducts((await api.getProducts()).items);
  }, []);
  const refreshCart = useCallback(async () => {
    setCart((await api.getCart()).cart.items);
  }, []);
  const refreshOrders = useCallback(async () => {
    setOrders((await api.getOrders()).orders);
  }, []);
  const refreshNotifications = useCallback(async () => {
    if (user) setNotifications((await api.getNotifications(user.email)).notifications);
  }, [user]);

  // Load public products on mount.
  useEffect(() => {
    refreshProducts().catch(fail);
  }, [refreshProducts]);

  // When a user logs in, load their data.
  useEffect(() => {
    if (!user) return;
    Promise.all([refreshCart(), refreshOrders(), refreshNotifications()]).catch(fail);
  }, [user, refreshCart, refreshOrders, refreshNotifications]);

  async function handleAuth(mode: 'login' | 'register', email: string, password: string, name: string) {
    setError('');
    try {
      const res = mode === 'register' ? await api.register(email, password, name) : await api.login(email, password);
      setToken(res.accessToken);
      setUser(res.user);
      flashToast(`Welcome, ${res.user.name}!`);
    } catch (e) {
      fail(e);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setCart([]);
    setOrders([]);
    setNotifications([]);
  }

  async function addToCart(p: Product) {
    setError('');
    try {
      const existing = cart.find((c) => c.productId === p.id);
      const qty = (existing?.quantity ?? 0) + 1;
      await api.addToCart(p.id, qty);
      await refreshCart();
      flashToast(`Added ${p.name} to cart`);
    } catch (e) {
      fail(e);
    }
  }

  async function placeOrder() {
    setError('');
    try {
      const { order } = await api.placeOrder();
      flashToast(`Order placed: ${money(order.totalAmount, order.currency)} (pending payment)`);
      await Promise.all([refreshCart(), refreshOrders(), refreshProducts()]);
    } catch (e) {
      fail(e);
    }
  }

  async function simulate(order: Order, succeed: boolean) {
    setError('');
    try {
      flashToast(succeed ? 'Sending successful payment…' : 'Sending failed payment…');
      await api.simulatePayment(order.id, succeed);
      // Poll until the saga settles the order.
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const { order: o } = await api.getOrder(order.id);
        if (o.status !== 'pending_payment') break;
      }
      await Promise.all([refreshOrders(), refreshNotifications(), refreshProducts()]);
      flashToast('Payment processed — watch the order status update');
    } catch (e) {
      fail(e);
    }
  }

  const cartCount = cart.reduce((n, c) => n + c.quantity, 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🛒 ShopMicro <span className="brand-sub">microservices demo</span></div>
        <div className="user-area">
          {user ? (
            <>
              <span className="pill">{user.name} · {user.role}</span>
              <span className="pill pill-cart">cart: {cartCount}</span>
              <button className="btn btn-ghost" onClick={logout}>Log out</button>
            </>
          ) : (
            <span className="muted">not logged in</span>
          )}
        </div>
      </header>

      {error && <div className="banner banner-error" onClick={() => setError('')}>⚠ {error} (click to dismiss)</div>}
      {toast && <div className="toast">{toast}</div>}

      {!user ? (
        <AuthPanel onAuth={handleAuth} />
      ) : (
        <main className="grid">
          <section className="panel">
            <h2>Products</h2>
            <div className="products">
              {products.map((p) => (
                <div key={p.id} className="product-card">
                  <div className="product-name">{p.name}</div>
                  <div className="product-desc">{p.description}</div>
                  <div className="product-meta">
                    <span className="price">{money(p.price, p.currency)}</span>
                    <span className={p.stock > 0 ? 'stock' : 'stock stock-out'}>stock: {p.stock}</span>
                  </div>
                  <button className="btn" disabled={p.stock <= 0} onClick={() => addToCart(p)}>
                    Add to cart
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Cart</h2>
            {cart.length === 0 ? (
              <p className="muted">Your cart is empty.</p>
            ) : (
              <>
                <ul className="cart-list">
                  {cart.map((c) => {
                    const p = products.find((x) => x.id === c.productId);
                    return (
                      <li key={c.productId}>
                        <span>{p?.name ?? c.productId}</span>
                        <span className="muted">× {c.quantity}</span>
                      </li>
                    );
                  })}
                </ul>
                <button className="btn btn-primary" onClick={placeOrder}>Place order →</button>
              </>
            )}

            <h2 style={{ marginTop: 24 }}>Your orders</h2>
            {orders.length === 0 ? (
              <p className="muted">No orders yet.</p>
            ) : (
              <ul className="order-list">
                {orders.map((o) => (
                  <li key={o.id} className="order">
                    <div className="order-head">
                      <span className={`badge ${STATUS_COLORS[o.status] ?? 'badge-gray'}`}>{o.status}</span>
                      <span className="order-total">{money(o.totalAmount, o.currency)}</span>
                    </div>
                    <div className="order-items muted">
                      {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </div>
                    {o.status === 'pending_payment' && (
                      <div className="order-actions">
                        <button className="btn btn-green" onClick={() => simulate(o, true)}>Simulate payment ✓</button>
                        <button className="btn btn-red" onClick={() => simulate(o, false)}>Simulate failure ✕</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Notifications</h2>
            <p className="muted small">
              Emails sent by the notifications service (it consumes events independently — no service calls it directly).
            </p>
            <button className="btn btn-ghost" onClick={() => refreshNotifications().catch(fail)}>↻ Refresh</button>
            {notifications.length === 0 ? (
              <p className="muted">No notifications yet.</p>
            ) : (
              <ul className="notif-list">
                {notifications.map((n, idx) => (
                  <li key={idx} className="notif">
                    <span className="notif-type">{n.type}</span>
                    <div className="notif-subject">{n.subject}</div>
                    <div className="notif-body muted small">{n.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      )}

      <footer className="footer muted small">
        API gateway: <code>{api.base}</code> · auth · catalog · orders · payments · notifications · RabbitMQ
      </footer>
    </div>
  );
}

function AuthPanel({
  onAuth,
}: {
  onAuth: (mode: 'login' | 'register', email: string, password: string, name: string) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('demo@shop.test');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Demo User');

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="tabs">
          <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>
            Register
          </button>
          <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>
            Log in
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAuth(mode, email, password, name);
          }}
        >
          {mode === 'register' && (
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit">
            {mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="muted small">Pre-filled with demo credentials — just hit the button.</p>
      </div>
    </div>
  );
}
