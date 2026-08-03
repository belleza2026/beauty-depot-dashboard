import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProducts, useSales, useHistory } from '../lib/useData';
import { Loading, EmptyState, StockBadge, KpiCard } from '../components/ui';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { PALETTE } from '../components/charts';
import { Q, num, fecha, fechaHora, stockLevel } from '../lib/format';

function HistoryChart({ history }) {
  const grid = document.documentElement.classList.contains('dark') ? PALETTE.gridDark : PALETTE.grid;
  const data = history.map((h) => ({ ...h, label: fecha(h.at) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: PALETTE.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: grid }} />
        <YAxis tick={{ fill: PALETTE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 12, border: `1px solid ${grid}` }}
          formatter={(v) => [num(v), 'Stock']}
        />
        <Line type="stepAfter" dataKey="stock" name="Stock" stroke={PALETTE.blue} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ProductoDetalle() {
  const { id } = useParams();
  const pid = Number(id);
  const { data, loading } = useProducts();
  const { data: sales } = useSales();
  const { data: history } = useHistory(pid);

  const product = useMemo(() => data?.products.find((p) => p.id === pid), [data, pid]);
  const prodSales = sales?.byProduct?.find((p) => p.id === pid);

  if (loading) return <Loading label="Cargando producto…" />;
  if (!product)
    return (
      <EmptyState title="Producto no encontrado">
        <Link to="/inventario" className="text-brand-500">← Volver al inventario</Link>
      </EmptyState>
    );

  const lvl = stockLevel(product.stock, product.isInStock);

  return (
    <div className="space-y-6">
      <Link to="/inventario" className="text-sm text-brand-500 hover:underline">← Inventario</Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Imagen + info */}
        <div className="card p-6 lg:col-span-1">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full aspect-square object-contain rounded-xl bg-slate-50 dark:bg-slate-800" />
          ) : (
            <div className="w-full aspect-square rounded-xl bg-slate-100 dark:bg-slate-800" />
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {product.categories.map((c) => (
              <span key={c} className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c}</span>
            ))}
          </div>
          <a href={product.permalink} target="_blank" rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
            Ver en la tienda ↗
          </a>
        </div>

        {/* Datos */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{product.name}</h1>
              <StockBadge level={lvl} />
            </div>
            <div className="mt-1 text-sm text-slate-400 tabular-nums">SKU: {product.sku || '—'}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Precio actual" value={Q(product.price)} sub={product.onSale ? `Antes ${Q(product.regularPrice)}` : 'Sin descuento'} accent="brand" />
            <KpiCard label="En inventario" value={product.stock == null ? '—' : num(product.stock)} sub="unidades" accent="sky" />
            <KpiCard label="Descuento" value={product.onSale ? `${product.discountPct}%` : '—'} accent="rose" />
            <KpiCard label="Valor en stock" value={product.stock != null ? Q(product.price * product.stock) : '—'} accent="emerald" />
          </div>

          {prodSales && (
            <div className="grid grid-cols-2 gap-4">
              <KpiCard label="Vendido (estimado)" value={num(prodSales.units)} sub="unidades acumuladas" accent="violet" />
              <KpiCard label="Ingreso estimado" value={Q(prodSales.revenue)} accent="amber" />
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Historial de inventario</h2>
            <p className="text-xs text-slate-400 mb-3">Nivel de stock en cada captura</p>
            {history && history.length > 1 ? (
              <HistoryChart history={history} />
            ) : (
              <div className="h-[200px] grid place-items-center text-sm text-slate-400 text-center px-6">
                Se necesitan ≥2 capturas para ver la evolución. Última captura: {fechaHora(history?.[0]?.at || data.capturedAt)}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
