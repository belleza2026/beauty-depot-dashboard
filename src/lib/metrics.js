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

// Filtra los últimos N días de un arreglo byDay (para ventas). n=null => todo.
export function lastNDays(byDay, n) {
  if (!byDay?.length) return [];
  if (n == null) return byDay;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  const iso = cutoff.toISOString().slice(0, 10);
  return byDay.filter((d) => d.day >= iso);
}

// --- Agrupación de ventas por dimensión (para la página de Ventas) ---

const isoCutoff = (days) => {
  if (days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

// Filtra eventos de venta por periodo (días; null = todo).
export function ventaEvents(events, days) {
  const cut = isoCutoff(days);
  return (events || []).filter((e) => e.type === 'venta' && (!cut || e.at >= cut));
}

// Serie temporal por día a partir de eventos filtrados.
export function seriesByDay(events) {
  const m = new Map();
  for (const e of events) {
    const k = e.at.slice(0, 10);
    const r = m.get(k) || { key: k, label: k, units: 0, revenue: 0 };
    r.units += e.units;
    r.revenue += e.revenue;
    m.set(k, r);
  }
  return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// Serie por semana ISO (agrupada por lunes).
export function seriesByWeek(events) {
  const m = new Map();
  for (const e of events) {
    const d = new Date(e.at);
    const day = (d.getUTCDay() + 6) % 7; // 0 = lunes
    d.setUTCDate(d.getUTCDate() - day);
    const k = d.toISOString().slice(0, 10);
    const r = m.get(k) || { key: k, label: `Sem ${k.slice(5)}`, units: 0, revenue: 0 };
    r.units += e.units;
    r.revenue += e.revenue;
    m.set(k, r);
  }
  return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function seriesByMonth(events) {
  const m = new Map();
  for (const e of events) {
    const k = e.at.slice(0, 7);
    const label = `${MESES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
    const r = m.get(k) || { key: k, label, units: 0, revenue: 0 };
    r.units += e.units;
    r.revenue += e.revenue;
    m.set(k, r);
  }
  return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// Agrega eventos por categoría (una venta suma a cada categoría del producto).
export function aggByCategory(events) {
  const m = new Map();
  for (const e of events) {
    for (const c of e.categories || []) {
      const r = m.get(c) || { name: c, units: 0, revenue: 0 };
      r.units += e.units;
      r.revenue += e.revenue;
      m.set(c, r);
    }
  }
  return [...m.values()];
}

// Eventos de venta de un día específico (dayISO = 'YYYY-MM-DD').
export function ventaEventsOnDay(events, dayISO) {
  return (events || []).filter((e) => e.type === 'venta' && e.at.slice(0, 10) === dayISO);
}

// Lista de días (desc) que tienen al menos una venta.
export function daysWithSales(events) {
  const s = new Set();
  for (const e of events || []) if (e.type === 'venta') s.add(e.at.slice(0, 10));
  return [...s].sort((a, b) => b.localeCompare(a));
}

// Agrega eventos por producto.
export function aggByProduct(events) {
  const m = new Map();
  for (const e of events) {
    const r = m.get(e.id) || { id: e.id, name: e.name, sku: e.sku, units: 0, revenue: 0 };
    r.units += e.units;
    r.revenue += e.revenue;
    m.set(e.id, r);
  }
  return [...m.values()];
}
