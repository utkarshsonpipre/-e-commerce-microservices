import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { money } from '../lib/format';
import { imageFor } from '../lib/images';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';

export function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { enriched, subtotal, remove, refresh } = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

  const checkout = async () => {
    setPlacing(true);
    try {
      const { order } = await api.placeOrder();
      await refresh();
      closeCart();
      toast.success('Order placed! Complete payment from your orders.');
      navigate(`/orders?highlight=${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ShoppingBag size={18} className="text-brand-400" /> Your Cart
              </h2>
              <button onClick={closeCart} className="btn btn-ghost !px-2.5">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {enriched.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-slate-500">
                  <div>
                    <ShoppingBag size={40} className="mx-auto mb-3 opacity-40" />
                    Your cart is empty.
                  </div>
                </div>
              ) : (
                enriched.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <img src={imageFor(product)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-slate-400">
                        {quantity} × {money(product.price, product.currency)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <span className="font-semibold">{money(product.price * quantity, product.currency)}</span>
                      <button onClick={() => remove(product.id)} className="text-slate-500 hover:text-rose-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between text-lg">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-bold gradient-text">{money(subtotal)}</span>
              </div>
              <button
                onClick={checkout}
                disabled={enriched.length === 0 || placing}
                className="btn btn-primary w-full !py-3"
              >
                {placing ? 'Placing order…' : 'Checkout'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
