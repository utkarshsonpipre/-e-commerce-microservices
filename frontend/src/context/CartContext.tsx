import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { api, type CartItem, type Product } from '../api';
import { useAuth } from './AuthContext';

export interface EnrichedItem {
  product: Product;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  productMap: Record<string, Product>;
  enriched: EnrichedItem[];
  count: number;
  subtotal: number;
  refresh: () => Promise<void>;
  add: (product: Product, quantity?: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  reset: () => void;
}

const Ctx = createContext<CartCtx>(null as unknown as CartCtx);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const [{ cart }, { items: products }] = await Promise.all([api.getCart(), api.getProducts()]);
    const map: Record<string, Product> = {};
    products.forEach((p) => (map[p.id] = p));
    setProductMap(map);
    setItems(cart.items);
  }, [user]);

  const add = useCallback(
    async (product: Product, quantity = 1) => {
      const existing = items.find((i) => i.productId === product.id);
      const qty = (existing?.quantity ?? 0) + quantity;
      const { cart } = await api.addToCart(product.id, qty);
      setProductMap((m) => ({ ...m, [product.id]: product }));
      setItems(cart.items);
    },
    [items],
  );

  const remove = useCallback(async (productId: string) => {
    const { cart } = await api.removeFromCart(productId);
    setItems(cart.items);
  }, []);

  const clear = useCallback(async () => {
    await api.clearCart();
    setItems([]);
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setProductMap({});
  }, []);

  const enriched: EnrichedItem[] = items
    .filter((i) => productMap[i.productId])
    .map((i) => ({ product: productMap[i.productId], quantity: i.quantity }));
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = enriched.reduce((s, e) => s + e.product.price * e.quantity, 0);

  return (
    <Ctx.Provider value={{ items, productMap, enriched, count, subtotal, refresh, add, remove, clear, reset }}>
      {children}
    </Ctx.Provider>
  );
}
