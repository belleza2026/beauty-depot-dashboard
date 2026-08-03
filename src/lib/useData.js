// Carga y cachea los JSON generados por el scraper.
import { useEffect, useState } from 'react';

const cache = new Map();

// BASE_URL respeta el subdirectorio del deploy (p.ej. GitHub Pages /repo/).
const base = import.meta.env.BASE_URL || '/';
const url = (path) => `${base}${path}`.replace(/\/{2,}/g, '/').replace(':/', '://');

async function loadJson(u) {
  if (cache.has(u)) return cache.get(u);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`No se pudo cargar ${u} (HTTP ${res.status})`);
  const data = await res.json();
  cache.set(u, data);
  return data;
}

export function useJson(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    setState({ data: null, loading: true, error: null });
    loadJson(url(path))
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => {
      alive = false;
    };
  }, [path]);
  return state;
}

export function useProducts() {
  return useJson('data/products-latest.json');
}
export function useSales() {
  return useJson('data/sales-inferred.json');
}
export function useCategories() {
  return useJson('data/categories.json');
}

// Historial: un único history.json { id: [...] }. Devuelve la serie del producto.
export function useHistory(id) {
  const { data, loading, error } = useJson('data/history.json');
  return { data: data ? data[id] || [] : null, loading, error };
}
