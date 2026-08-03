import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Q, num, stockLevel } from '../lib/format';
import { StockBadge } from './ui';

const PAGE_SIZE = 40;

export default function ProductTable({ products, categories = [] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [estado, setEstado] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = products.filter((p) => {
      if (needle && !(p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)))
        return false;
      if (cat && !p.categories.includes(cat)) return false;
      if (estado) {
        const lvl = stockLevel(p.stock, p.isInStock).key;
        if (estado === 'out' && lvl !== 'out') return false;
        if (estado === 'low' && lvl !== 'low') return false;
        if (estado === 'in' && (lvl === 'out')) return false;
      }
      return true;
    });
    const { key, dir } = sort;
    const mul = dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av = a[key];
      let bv = b[key];
      if (key === 'stock') {
        av = av ?? -1;
        bv = bv ?? -1;
      }
      if (typeof av === 'string') return av.localeCompare(bv) * mul;
      return (av - bv) * mul;
    });
    return list;
  }, [products, q, cat, estado, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const Th = ({ k, children, right }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
    >
      {children}
      {sort.key === k && <span className="ml-1 text-brand-500">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );

  return (
    <div className="card overflow-hidden">
      {/* Controles */}
      <div className="p-4 flex flex-wrap gap-3 items-center border-b border-slate-100 dark:border-slate-800">
        <div className="relative flex-1 min-w-[220px]">
          <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z"/></svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o SKU…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm outline-none focus:ring-2 ring-brand-400"
          />
        </div>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm outline-none">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm outline-none">
          <option value="">Todo estado</option>
          <option value="in">En stock</option>
          <option value="low">Bajo (≤2)</option>
          <option value="out">Agotado</option>
        </select>
        <div className="text-sm text-slate-400 ml-auto tabular-nums">{num(filtered.length)} resultados</div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide">
            <tr>
              <Th k="name">Producto</Th>
              <Th k="sku">SKU</Th>
              <Th k="price" right>Precio</Th>
              <Th k="stock" right>Stock</Th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {slice.map((p) => {
              const lvl = stockLevel(p.stock, p.isInStock);
              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/producto/${p.id}`)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-100 flex-shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[360px]">{p.name}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[360px]">{p.categories[0] || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 tabular-nums text-xs">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{Q(p.price)}</div>
                    {p.onSale && <div className="text-xs text-slate-400 line-through">{Q(p.regularPrice)}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                    {p.stock == null ? '—' : num(p.stock)}
                  </td>
                  <td className="px-4 py-3 text-right"><StockBadge level={lvl} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="p-4 flex items-center justify-between text-sm border-t border-slate-100 dark:border-slate-800">
        <button disabled={current <= 1} onClick={() => setPage(current - 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800">
          ← Anterior
        </button>
        <span className="text-slate-400">Página {current} de {pages}</span>
        <button disabled={current >= pages} onClick={() => setPage(current + 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800">
          Siguiente →
        </button>
      </div>
    </div>
  );
}
