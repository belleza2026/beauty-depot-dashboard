import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts, useSales } from '../lib/useData';
import { KpiCard, Loading, EmptyState, Banner } from '../components/ui';
import { SalesTrend, MagnitudeBars } from '../components/charts';
import { valueByCategory, lastNDays } from '../lib/metrics';
import { Q, Qcompact, num, fecha } from '../lib/format';

export default function Ventas() {
  const { data: prod } = useProducts();
  const { data: sales, loading, error } = useSales();
  const [metric, setMetric] = useState('units');
  const [range, setRange] = useState(30);

  const invValue = useMemo(() => (prod ? valueByCategory(prod.products, 10) : []), [prod]);

  if (loading) return <Loading label="Cargando ventas…" />;
  if (error || !sales) return <EmptyState title="Sin datos de ventas">Corre el scraper para empezar.</EmptyState>;

  if (!sales.hasSales) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ventas estimadas</h1>
          <p className="text-sm text-slate-400">Inferidas por cambios de inventario</p>
        </div>
        <Banner tone="info">
          {sales.note || 'Se necesitan al menos 2 capturas para inferir ventas.'} Mientras tanto puedes
          generar una demostración con <code>npm run seed-demo</code>.
        </Banner>
        {invValue.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Valor de inventario por categoría</h2>
            <p className="text-xs text-slate-400 mb-3">Métrica derivada del catálogo (stock × precio)</p>
            <MagnitudeBars data={invValue} valueFmt={Qcompact} height={340} />
          </div>
        )}
      </div>
    );
  }

  const byDay = lastNDays(sales.byDay, range);
  const units = byDay.reduce((s, d) => s + d.units, 0);
  const revenue = byDay.reduce((s, d) => s + d.revenue, 0);
  const topUnits = sales.byProduct.slice(0, 10).map((p) => ({ name: p.name, value: p.units, id: p.id }));
  const topRev = [...sales.byProduct].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    .map((p) => ({ name: p.name, value: Math.round(p.revenue), id: p.id }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ventas estimadas</h1>
          <p className="text-sm text-slate-400">
            Inferidas por cambios de inventario · {fecha(sales.firstCapture)} → {fecha(sales.lastCapture)}
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((n) => (
            <button key={n} onClick={() => setRange(n)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${range === n ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
              {n} días
            </button>
          ))}
        </div>
      </div>

      {sales.isDemo && (
        <Banner tone="warn">
          <b>Modo demostración:</b> datos de ejemplo (<code>npm run seed-demo</code>). Se reemplazan por ventas reales al correr <code>npm run scrape</code> a diario.
        </Banner>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={`Unidades (${range} d)`} value={num(units)} sub="estimado" accent="violet" />
        <KpiCard label={`Ingreso (${range} d)`} value={Q(revenue)} sub="estimado" accent="emerald" />
        <KpiCard label="Productos con ventas" value={num(sales.byProduct.length)} accent="sky" />
        <KpiCard label="Restock (total)" value={num(sales.totals.restockUnits)} sub="unidades repuestas" accent="amber" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Tendencia de ventas estimadas</h2>
          <div className="flex gap-2 text-sm">
            <button onClick={() => setMetric('units')} className={metric === 'units' ? 'text-brand-500 font-semibold' : 'text-slate-400'}>Unidades</button>
            <span className="text-slate-300">·</span>
            <button onClick={() => setMetric('revenue')} className={metric === 'revenue' ? 'text-brand-500 font-semibold' : 'text-slate-400'}>Ingreso</button>
          </div>
        </div>
        <SalesTrend data={byDay} metric={metric} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Top 10 por unidades vendidas</h2>
          <MagnitudeBars data={topUnits} valueFmt={num} height={340} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Top 10 por ingreso estimado</h2>
          <MagnitudeBars data={topRev} valueFmt={Qcompact} height={340} />
        </div>
      </div>

      {/* Tabla de productos con ventas */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Detalle por producto</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Producto</th>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-right font-semibold">Unidades</th>
                <th className="px-4 py-3 text-right font-semibold">Ingreso est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.byProduct.slice(0, 50).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5">
                    <Link to={`/producto/${p.id}`} className="font-medium text-slate-800 dark:text-slate-100 hover:text-brand-500 truncate block max-w-[420px]">{p.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs tabular-nums">{p.sku || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{num(p.units)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Q(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
