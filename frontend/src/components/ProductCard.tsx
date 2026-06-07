import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product } from '../api';
import { money } from '../lib/format';
import { imageFor, fallbackImage } from '../lib/images';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { Stars, ratingFor } from './ui';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const { openAuth } = useUI();
  const { rating } = ratingFor(product.sku || product.id);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuth();
      return;
    }
    try {
      await add(product);
      toast.success(`Added ${product.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={{ y: -6 }}
      onClick={() => navigate(`/product/${product.id}`)}
      className="glass group cursor-pointer overflow-hidden transition-shadow hover:shadow-glow"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-800">
        <img
          src={imageFor(product)}
          onError={(e) => ((e.currentTarget as HTMLImageElement).src = fallbackImage(product.sku || product.id))}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm font-semibold text-rose-300">
            Out of stock
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium capitalize text-white backdrop-blur">
          {product.category}
        </span>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-semibold">{product.name}</h3>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Stars value={rating} />
          <span>{rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-bold gradient-text">{money(product.price, product.currency)}</span>
          <button
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="btn btn-primary !px-3 !py-2"
            aria-label="Add to cart"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
