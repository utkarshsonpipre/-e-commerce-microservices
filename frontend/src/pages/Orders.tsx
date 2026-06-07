import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, type Order } from '../api';
import { money, timeAgo } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { StatusBadge } from '../components/ui';

export function Orders() {
  const { user } = useAuth();
  const { openAuth } = useUI();
  const [params] = useSearchParams();
  const highlight = params.get('highlight');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setOrders((await api.getOrders()).orders);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const simulate = async (order: Order, succeed: boolean) => {
    setBusyId(order.id);
    try {
      await api.simulatePayment(order.id, succeed);
      // Poll until the saga settles the order.
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const { orders } = await api.getOrders();
        const updated = orders.find((o) => o.id === order.id);
        if (updated && updated.status !== 'pending_payment') {
          setOrders(orders);
          toast[succeed ? 'success' : 'error'](
            succeed ? 'Payment confirmed — order paid!' : 'Payment failed — stock released.',
          );
          return;
        }
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setBusyId(null);
    }
  };

  if (!user) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <Package size={48} className="mb-4 text-slate-600" />
        <p className="mb-4 text-slate-400">Sign in to view your orders.</p>
        <button onClick={openAuth} className="btn btn-primary">Sign in</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-extrabold">Your Orders</h1>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="grid place-items-center py-20 text-slate-500">
          <Package size={40} className="mb-3 opacity-40" />
          No orders yet — go grab something from the shop!
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass p-5 ${highlight === o.id ? 'ring-2 ring-brand-500 shadow-glow' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-slate-500">{timeAgo(o.createdAt)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-600">#{o.id}</div>
                </div>
                <div className="text-right text-xl font-bold gradient-text">
                  {money(o.totalAmount, o.currency)}
                </div>
              </div>

              {/* Visual status stepper */}
              <div className="mt-4 flex items-center gap-2 text-xs">
                <Step active label="Placed" done />
                <Line done={o.status !== 'pending_payment'} />
                <Step
                  active={o.status === 'paid'}
                  done={o.status === 'paid'}
                  failed={o.status === 'failed'}
                  label={o.status === 'failed' ? 'Failed' : 'Paid'}
                />
              </div>

              {o.status === 'pending_payment' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => simulate(o, true)}
                    disabled={busyId === o.id}
                    className="btn btn-success flex-1"
                  >
                    {busyId === o.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Simulate payment
                  </button>
                  <button
                    onClick={() => simulate(o, false)}
                    disabled={busyId === o.id}
                    className="btn btn-danger flex-1"
                  >
                    <XCircle size={16} /> Simulate failure
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Step({ active, done, failed, label }: { active?: boolean; done?: boolean; failed?: boolean; label: string }) {
  const color = failed
    ? 'bg-rose-500 text-white'
    : done
      ? 'bg-emerald-500 text-white'
      : active
        ? 'bg-brand-500 text-white'
        : 'bg-white/10 text-slate-400';
  return (
    <span className="flex items-center gap-1.5">
      <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${color}`}>
        {failed ? '✕' : done ? '✓' : '•'}
      </span>
      <span className="text-slate-400">{label}</span>
    </span>
  );
}

function Line({ done }: { done?: boolean }) {
  return <span className={`h-0.5 w-8 rounded ${done ? 'bg-emerald-500' : 'bg-white/10'}`} />;
}
