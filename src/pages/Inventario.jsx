import { useMemo } from 'react';
import { useProducts } from '../lib/useData';
import ProductTable from '../components/ProductTable';
import { Loading, EmptyState } from '../components/ui';

export default function Inventario() {
  const { data, loading, error } = useProducts();

  const categories = useMemo(() => {
    if (!data) return [];
    const s = new Set();
    data.products.forEach((p) => p.categories.forEach((c) => s.add(c)));
    return [...s].sort();
  }, [data]);

  if (loading) return <Loading label="Cargando inventario…" />;
  if (error || !data)
    return (
      <EmptyState title="Aún no hay datos de inventario">
        Corre <code className="text-brand-500">npm run scrape</code> para bajar el catálogo de Beauty Depot.
      </EmptyState>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Inventario</h1>
        <p className="text-sm text-slate-400">
          {data.productCount.toLocaleString('es-GT')} productos · haz clic en una fila para ver el detalle
        </p>
      </div>
      <ProductTable products={data.products} categories={categories} />
    </div>
  );
}
