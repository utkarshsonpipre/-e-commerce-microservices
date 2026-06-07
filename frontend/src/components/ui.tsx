import { Star } from 'lucide-react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

/** Deterministic pseudo-rating (4.0–5.0) from a seed, so the UI feels populated. */
export function ratingFor(seed: string): { rating: number; reviews: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rating = 4 + (h % 11) / 10; // 4.0 .. 5.0
  const reviews = 20 + (h % 480);
  return { rating: Math.min(5, rating), reviews };
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(value) ? 'fill-amber-400' : 'fill-transparent text-slate-600'}
        />
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace('_', ' ');
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
        STATUS_STYLES[status] ?? STATUS_STYLES.cancelled
      }`}
    >
      {label}
    </span>
  );
}
