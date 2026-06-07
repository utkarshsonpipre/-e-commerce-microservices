import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Orders } from './pages/Orders';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { api } from './api';

export default function App() {
  const { user } = useAuth();
  const { refresh, reset } = useCart();

  // Keep the cart in sync with the logged-in user.
  useEffect(() => {
    if (user) refresh();
    else reset();
  }, [user, refresh, reset]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="*" element={<Catalog />} />
        </Routes>
      </main>

      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-slate-500">
        ShopMicro — gateway <code className="text-slate-400">{api.base}</code> · auth · catalog · orders ·
        payments · notifications · RabbitMQ
      </footer>

      <CartDrawer />
      <AuthModal />
    </div>
  );
}
