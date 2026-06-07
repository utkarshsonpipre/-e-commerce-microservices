import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Boxes } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useCart } from '../context/CartContext';

export function AuthModal() {
  const { authOpen, closeAuth } = useUI();
  const { login, register } = useAuth();
  const { refresh } = useCart();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('demo@shop.test');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Demo User');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'register') await register(email, password, name);
      else await login(email, password);
      await refresh();
      closeAuth();
      toast.success(mode === 'register' ? 'Account created!' : 'Welcome back!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {authOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuth}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass relative w-full max-w-md p-7"
          >
            <button onClick={closeAuth} className="absolute right-4 top-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            <div className="mb-5 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient shadow-glow">
                <Boxes size={20} className="text-white" />
              </span>
              <span className="text-xl font-extrabold gradient-text">ShopMicro</span>
            </div>

            <div className="mb-5 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              {(['register', 'login'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                    mode === m ? 'bg-brand-gradient text-white shadow-glow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'register' ? 'Sign up' : 'Log in'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3">
                {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-slate-500">Pre-filled with demo credentials — just submit.</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
