import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts, useSales } from '../lib/useData';
import { KpiCard, Loading, EmptyState, Banner } from '../components/ui';
import { SalesTrend, MagnitudeBars, DistributionBars } from '../components/charts';
import { catalogMetrics, byCategory, priceDistribution, ventaEvents, seriesByDay } from '../lib/metrics';
import { Q, Qcompact, num } from '../lib/format';

export default function Dashboard() {
  const { data, loading, error } = useProducts();
  const { data: sales } = useSales();

  const m = useMemo(() => (data ? catalogMetrics(data.products) : null), [data]);
  const cats = useMemo(() => (data ? byCategory(data.products, 10) : []), [data]);
  const prices = useMemo(() => (data ? priceDistribution(data.products) : []), [data]);

  if (loading) return <Loading label="Cargando dashboard…" />;
  if (error || !data)
    return (
      <EmptyState title="Aún no hay datos">
        Corre <code className="text-brand-500">npm run scrape</code> para generar el primer snapshot del inventario.
      </EmptyState>
    );

  // Todo en hora de Guatemala, calculado desde los eventos (consistente con Ventas).
  const ev30 = sales?.hasSales ? ventaEvents(sales.events, 30) : [];
  const daySerie = sales?.hasSales ? seriesByDay(ventaEvents(sales.events, null)) : [];
  const units30 = ev30.reduce((s, e) => s + e.units, 0);
  const rev30 = ev30.reduce((s, e) => s + e.revenue, 0);
  const topProducts = sales?.byProduct?.slice(0, 8).map((p) => ({ name: p.name, value: p.units })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-400">Resumen del inventario de Beauty Depot</p>
      </div>

      {sales?.isDemo && (
        <Banner tone="warn">
          <b>Modo demostración:</b> las ventas mostradas provienen de capturas de ejemplo generadas
          con <code>npm run seed-demo</code>. Al correr <code>npm run scrape</code> a diario se
          reemplazan por ventas reales inferidas.
        </Banner>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Productos" value={num(m.total)} sub={`${num(m.inStock)} en stock · ${num(m.out)} agotados`} accent="brand" />
        <KpiCard label="Unidades en stock" value={num(m.units)} sub={m.unknownStock ? `${num(m.unknownStock)} sin dato exacto` : 'cantidad exacta'} accent="sky" />
        <KpiCard label="Valor de inventario" value={Qcompact(m.value)} sub="Σ (stock × precio)" accent="emerald" />
        <KpiCard label="Bajo stock (≤2)" value={num(m.low)} sub={`${num(m.onSale)} en oferta`} accent="rose" />
      </div>

      {/* Ventas estimadas */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Ventas estimadas (unidades/día)</h2>
            <Link to="/ventas" className="text-xs text-brand-500 hover:underline">Ver detalle →</Link>
          </div>
          <p className="text-xs text-slate-400 mb-3">Estimadas por cambios de inventario entre capturas</p>
          {sales?.hasSales ? (
            <SalesTrend data={daySerie} metric="units" xKey="label" />
          ) : (
            <div className="h-[260px] grid place-items-center text-center text-sm text-slate-400 px-6">
              Las ventas aparecerán cuando haya ≥2 capturas. Corre <code className="mx-1 text-brand-500">npm run scrape</code> periódicamente (o <code className="mx-1">npm run seed-demo</code> para ver una demostración).
            </div>
          )}
        </div>
        <div className="grid grid-rows-2 gap-4">
          <KpiCard label="Unidades vendidas (30 d)" value={num(units30)} sub="estimado" accent="violet" />
          <KpiCard label="Ingreso estimado (30 d)" value={Qcompact(rev30)} sub="estimado" accent="amber" />
        </div>
      </div>

      {/* Gráficas de catálogo */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Productos por categoría</h2>
          <p className="text-xs text-slate-400 mb-3">Top 10 categorías por número de productos</p>
          <MagnitudeBars data={cats} valueFmt={num} height={320} />
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Distribución de precios</h2>
            <p className="text-xs text-slate-400 mb-3">Productos por rango de precio (Q)</p>
            <DistributionBars data={prices} />
          </div>
          {topProducts.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Top productos vendidos</h2>
              <p className="text-xs text-slate-400 mb-3">Por unidades estimadas</p>
              <MagnitudeBars data={topProducts} valueFmt={num} height={200} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
