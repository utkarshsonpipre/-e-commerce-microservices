import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Minus, Plus, ShoppingCart, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, type Product } from '../api';
import { money } from '../lib/format';
import { imageFor, fallbackImage } from '../lib/images';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { Stars, ratingFor, Skeleton } from '../components/ui';

export function ProductDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const { openAuth, openCart } = useUI();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setLoading(true);
    api
      .getProduct(id)
      .then((r) => setProduct(r.product))
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const addToCart = async () => {
    if (!user) return openAuth();
    if (!product) return;
    try {
      await add(product, qty);
      toast.success(`Added ${qty} × ${product.name}`);
      openCart();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="grid place-items-center py-24 text-slate-400">
        <p>Product not found.</p>
        <Link to="/" className="btn btn-primary mt-4">Back to shop</Link>
      </div>
    );
  }

  const { rating, reviews } = ratingFor(product.sku || product.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button onClick={() => navigate(-1)} className="btn btn-ghost mb-6">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass overflow-hidden"
        >
          <img
            src={imageFor(product)}
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = fallbackImage(product.sku || product.id))}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium capitalize text-slate-300">
            {product.category}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
            <Stars value={rating} size={16} />
            <span className="font-medium text-slate-300">{rating.toFixed(1)}</span>
            <span>· {reviews} reviews</span>
          </div>

          <p className="mt-4 leading-relaxed text-slate-400">
            {product.description || 'A premium product crafted for everyday performance and reliability.'}
          </p>

          <div className="mt-6 text-4xl font-extrabold gradient-text">{money(product.price, product.currency)}</div>
          <div className={`mt-1 text-sm ${product.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1"><Check size={14} /> In stock ({product.stock})</span>
            ) : (
              'Out of stock'
            )}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-slate-400 hover:text-white">
                <Minus size={16} />
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                className="text-slate-400 hover:text-white"
              >
                <Plus size={16} />
              </button>
            </div>
            <button onClick={addToCart} disabled={product.stock <= 0} className="btn btn-primary flex-1 !py-3">
              <ShoppingCart size={18} /> Add to cart
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
