// Componentes de UI reutilizables.

export function StockBadge({ level }) {
  const map = {
    out: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    low: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    mid: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    unknown: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return <span className={`badge ${map[level.key] || map.unknown}`}>{level.label}</span>;
}

export function KpiCard({ label, value, sub, accent = 'brand', icon }) {
  const accents = {
    brand: 'from-brand-400 to-brand-600',
    emerald: 'from-emerald-400 to-emerald-600',
    amber: 'from-amber-400 to-amber-600',
    rose: 'from-rose-400 to-rose-600',
    sky: 'from-sky-400 to-sky-600',
    violet: 'from-violet-400 to-violet-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
        {icon && (
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accents[accent]} grid place-items-center text-white`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Loading({ label = 'Cargando…' }) {
  return (
    <div className="grid place-items-center h-64 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</div>
      <div className="mt-2 text-sm text-slate-400 max-w-md mx-auto">{children}</div>
    </div>
  );
}

export function Banner({ children, tone = 'info' }) {
  const tones = {
    info: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    warn: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  );
}
