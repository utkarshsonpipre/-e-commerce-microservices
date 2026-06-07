import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface UICtx {
  authOpen: boolean;
  cartOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const Ctx = createContext<UICtx>(null as unknown as UICtx);
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <Ctx.Provider value={{ authOpen, cartOpen, openAuth, closeAuth, openCart, closeCart }}>
      {children}
    </Ctx.Provider>
  );
}
