import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, LogOut, User as UserIcon, Boxes } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { openAuth, openCart } = useUI();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl dark:bg-ink-950/70">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient shadow-glow">
            <Boxes size={18} className="text-white" />
          </span>
          <span className="gradient-text hidden sm:inline">ShopMicro</span>
        </Link>

        <form onSubmit={submitSearch} className="relative ml-2 flex-1 max-w-xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="input !pl-9"
          />
        </form>

        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <Link to="/orders" className="btn btn-ghost hidden sm:inline-flex">
              Orders
            </Link>
          )}
          <button onClick={openCart} className="btn btn-ghost relative !px-2.5" aria-label="Cart">
            <ShoppingCart size={18} />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-brand-gradient px-1 text-[11px] font-bold text-white shadow-glow">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm md:flex">
                <UserIcon size={15} className="text-brand-400" />
                {user.name}
              </span>
              <button onClick={logout} className="btn btn-ghost !px-2.5" title="Log out">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button onClick={openAuth} className="btn btn-primary">
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
