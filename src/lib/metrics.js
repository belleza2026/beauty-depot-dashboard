// Cálculos derivados del catálogo para el Dashboard.
import { stockLevel } from './format';

export function catalogMetrics(products) {
  let inStock = 0;
  let out = 0;
  let low = 0;
  let onSale = 0;
  let units = 0;
  let value = 0;
  let unknownStock = 0;

  for (const p of products) {
    const lvl = stockLevel(p.stock, p.isInStock).key;
    if (lvl === 'out') out++;
    else inStock++;
    if (lvl === 'low') low++;
    if (p.onSale) onSale++;
    if (typeof p.stock === 'number') {
      units += p.stock;
      value += (p.price || 0) * p.stock;
    } else {
      unknownStock++;
    }
  }
  return { total: products.length, inStock, out, low, onSale, units, value, unknownStock };
}

// Conteo de productos por categoría (top N), medida única.
export function byCategory(products, topN = 10) {
  const m = new Map();
  for (const p of products) {
    for (const c of p.categories) m.set(c, (m.get(c) || 0) + 1);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

// Histograma de precios en rangos fijos (Q).
export function priceDistribution(products) {
  const buckets = [
    { label: '0–50', min: 0, max: 50 },
    { label: '50–100', min: 50, max: 100 },
    { label: '100–200', min: 100, max: 200 },
    { label: '200–400', min: 200, max: 400 },
    { label: '400–800', min: 400, max: 800 },
    { label: '800+', min: 800, max: Infinity },
  ];
  return buckets.map((b) => ({
    label: b.label,
    count: products.filter((p) => p.price != null && p.price >= b.min && p.price < b.max).length,
  }));
}

// Valor de inventario por categoría (stock × precio).
export function valueByCategory(products, topN = 10) {
  const m = new Map();
  for (const p of products) {
    if (typeof p.stock !== 'number') continue;
    const v = (p.price || 0) * p.stock;
    for (const c of p.categories) m.set(c, (m.get(c) || 0) + v);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

// Filtra los últimos N días de un arreglo byDay (para ventas).
export function lastNDays(byDay, n) {
  if (!byDay?.length) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  const iso = cutoff.toISOString().slice(0, 10);
  return byDay.filter((d) => d.day >= iso);
}
