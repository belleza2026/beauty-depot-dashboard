import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSales } from '../lib/useData';
import { KpiCard, Loading, EmptyState, Banner } from '../components/ui';
import { SalesTrend, MagnitudeBars } from '../components/charts';
import {
  ventaEvents, seriesByDay, seriesByWeek, seriesByMonth, aggByCategory, aggByProduct,
} from '../lib/metrics';
import { Q, Qcompact, num, fecha } from '../lib/format';

const PERIODS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: 'Todo', days: null },
];
const GRANS = [
  { key: 'day', label: 'Día', fn: seriesByDay },
  { key: 'week', label: 'Semana', fn: seriesByWeek },
  { key: 'month', label: 'Mes', fn: seriesByMonth },
];
const VIEWS = [
  { key: 'tiempo', label: 'En el tiempo' },
  { key: 'categoria', label: 'Por categoría' },
  { key: 'producto', label: 'Por producto' },
];

// Botones tipo segmento reutilizables.
function Segmented({ options, value, onChange, getKey = (o) => o.key, getLabel = (o) => o.label }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 gap-1">
      {options.map((o) => {
        const k = getKey(o);
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              value === k ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {getLabel(o)}
          </button>
        );
      })}
    </div>
  );
}

export default function Ventas() {
  const { data: sales, loading, error } = useSales();
  const [days, setDays] = useState(30);
  const [view, setView] = useState('tiempo');
  const [gran, setGran] = useState('day');
  const [metric, setMetric] = useState('units');

  const events = useMemo(() => (sales ? ventaEvents(sales.events, days) : []), [sales, days]);
  const serie = useMemo(() => {
    const fn = GRANS.find((g) => g.key === gran).fn;
    return fn(events);
  }, [events, gran]);
  const cats = useMemo(() => aggByCategory(events).sort((a, b) => b[metric] - a[metric]), [events, metric]);
  const prods = useMemo(() => aggByProduct(events).sort((a, b) => b[metric] - a[metric]), [events, metric]);

  if (loading) return <Loading label="Cargando ventas…" />;
  if (error || !sales) return <EmptyState title="Sin datos de ventas">Corre el scraper para empezar.</EmptyState>;

  if (!sales.hasSales) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ventas estimadas</h1>
        <Banner tone="info">
          {sales.note || 'Se necesitan al menos 2 capturas para inferir ventas.'} En cuanto se
          acumulen capturas, aquí verás las ventas por día, semana, mes, categoría y producto.
        </Banner>
      </div>
    );
  }

  const units = events.reduce((s, e) => s + e.units, 0);
  const revenue = events.reduce((s, e) => s + e.revenue, 0);
  const metricFmt = metric === 'revenue' ? Q : num;
  const metricFmtC = metric === 'revenue' ? Qcompact : num;

  return (
    <div className="space-y-6">
      {/* Encabezado + periodo */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ventas estimadas</h1>
          <p className="text-sm text-slate-400">
            Inferidas por cambios de inventario · {fecha(sales.firstCapture)} → {fecha(sales.lastCapture)}
          </p>
        </div>
        <Segmented options={PERIODS} value={days} onChange={setDays} getKey={(o) => o.days} />
      </div>

      {sales.isDemo && (
        <Banner tone="warn">
          <b>Modo demostración:</b> datos de ejemplo. Se reemplazan por ventas reales al correr el scraper.
        </Banner>
      )}

      {/* KPIs del periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Unidades" value={num(units)} sub={PERIODS.find((p) => p.days === days).label} accent="violet" />
        <KpiCard label="Ingreso estimado" value={Q(revenue)} sub={PERIODS.find((p) => p.days === days).label} accent="emerald" />
        <KpiCard label="Categorías con ventas" value={num(cats.length)} accent="sky" />
        <KpiCard label="Productos con ventas" value={num(prods.length)} accent="amber" />
      </div>

      {/* Controles de vista + métrica */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented options={VIEWS} value={view} onChange={setView} />
        <Segmented
          options={[{ key: 'units', label: 'Unidades' }, { key: 'revenue', label: 'Ingreso' }]}
          value={metric}
          onChange={setMetric}
        />
      </div>

      {/* Vista: EN EL TIEMPO */}
      {view === 'tiempo' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Ventas por {GRANS.find((g) => g.key === gran).label.toLowerCase()}
            </h2>
            <Segmented options={GRANS} value={gran} onChange={setGran} />
          </div>
          {serie.length ? (
            <SalesTrend data={serie} metric={metric} xKey="label" height={300} />
          ) : (
            <div className="h-[300px] grid place-items-center text-sm text-slate-400">Sin ventas en este periodo.</div>
          )}
        </div>
      )}

      {/* Vista: POR CATEGORÍA */}
      {view === 'categoria' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Ventas por categoría</h2>
            {cats.length ? (
              <MagnitudeBars data={cats.slice(0, 12)} dataKey={metric} valueFmt={metricFmtC} height={Math.max(240, cats.slice(0, 12).length * 30)} />
            ) : (
              <div className="h-[240px] grid place-items-center text-sm text-slate-400">Sin datos.</div>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Detalle por categoría</h2>
            </div>
            <TablaSimple
              rows={cats}
              cols={[
                { h: 'Categoría', get: (r) => r.name, cls: 'font-medium text-slate-800 dark:text-slate-100' },
                { h: 'Unidades', get: (r) => num(r.units), right: true },
                { h: 'Ingreso est.', get: (r) => Q(r.revenue), right: true },
              ]}
            />
          </div>
        </div>
      )}

      {/* Vista: POR PRODUCTO */}
      {view === 'producto' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Top 15 productos</h2>
            {prods.length ? (
              <MagnitudeBars data={prods.slice(0, 15)} dataKey={metric} valueFmt={metricFmtC} height={Math.max(240, prods.slice(0, 15).length * 26)} />
            ) : (
              <div className="h-[240px] grid place-items-center text-sm text-slate-400">Sin datos.</div>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Detalle por producto</h2>
            </div>
            <TablaSimple
              rows={prods.slice(0, 100)}
              cols={[
                { h: 'Producto', get: (r) => <Link to={`/producto/${r.id}`} className="font-medium text-slate-800 dark:text-slate-100 hover:text-brand-500 block truncate max-w-[420px]">{r.name}</Link> },
                { h: 'SKU', get: (r) => r.sku || '—', cls: 'text-slate-400 text-xs' },
                { h: 'Unidades', get: (r) => num(r.units), right: true },
                { h: 'Ingreso est.', get: (r) => Q(r.revenue), right: true },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TablaSimple({ rows, cols }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={`px-4 py-3 font-semibold ${c.right ? 'text-right' : 'text-left'}`}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              {cols.map((c, j) => (
                <td key={j} className={`px-4 py-2.5 ${c.right ? 'text-right tabular-nums' : ''} ${c.cls || ''}`}>
                  {c.get(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
