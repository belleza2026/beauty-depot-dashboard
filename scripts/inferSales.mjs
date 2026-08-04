// Motor de inferencia de ventas.
//
// Compara snapshots (delgados) consecutivos por producto. Como cada snapshot tiene `stock`
// EXACTO, una caída de stock entre dos capturas = unidades vendidas (estimadas), y una
// subida = restock. Los nombres/SKU se toman de products-latest.json.
//
// Genera:
//   public/data/sales-inferred.json  -> eventos + agregados por día y por producto.
//   public/data/history.json         -> { id: [{at, stock, price}] } (1 punto/día, últimos 60 días).

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR, SNAP_DIR } from './lib/paths.mjs';

const HISTORY_DAYS = 60;

async function loadSnapshots() {
  let files;
  try {
    files = (await readdir(SNAP_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  files.sort(); // el nombre YYYY-MM-DD-HHmm ordena cronológicamente
  const snaps = [];
  for (const f of files) {
    const raw = JSON.parse(await readFile(join(SNAP_DIR, f), 'utf8'));
    snaps.push({ file: f, capturedAt: raw.capturedAt, products: raw.products });
  }
  return snaps;
}

async function loadProductMeta() {
  try {
    const latest = JSON.parse(await readFile(join(DATA_DIR, 'products-latest.json'), 'utf8'));
    const m = new Map();
    for (const p of latest.products) m.set(p.id, { name: p.name, sku: p.sku, categories: p.categories });
    return m;
  } catch {
    return new Map();
  }
}

const indexById = (products) => {
  const m = new Map();
  for (const p of products) m.set(p.id, p);
  return m;
};
const dayOf = (iso) => iso.slice(0, 10);

export async function runInference() {
  const snaps = await loadSnapshots();
  const meta = await loadProductMeta();
  const nameOf = (id) => meta.get(id)?.name || `#${id}`;

  await writeHistory(snaps);

  if (snaps.length < 2) {
    const empty = {
      generatedAt: new Date().toISOString(),
      snapshotCount: snaps.length,
      hasSales: false,
      note:
        'Se necesitan al menos 2 capturas para inferir ventas. Corre "npm run scrape" periódicamente.',
      events: [],
      byDay: [],
      byProduct: [],
      totals: { units: 0, revenue: 0, restockUnits: 0 },
    };
    await writeFile(join(DATA_DIR, 'sales-inferred.json'), JSON.stringify(empty));
    return { message: `sin ventas todavía (${snaps.length} captura/s)`, ...empty.totals };
  }

  const events = [];
  for (let i = 1; i < snaps.length; i++) {
    const prev = indexById(snaps[i - 1].products);
    const at = snaps[i].capturedAt;
    for (const p of snaps[i].products) {
      const before = prev.get(p.id);
      if (!before) continue;
      const a = before.stock;
      const b = p.stock;
      if (typeof a !== 'number' || typeof b !== 'number') continue;
      if (b < a) {
        const units = a - b;
        const price = before.price ?? p.price ?? 0;
        const m = meta.get(p.id) || {};
        events.push({
          type: 'venta', at, id: p.id, name: nameOf(p.id), sku: m.sku,
          categories: m.categories, units, price, revenue: units * price,
        });
      } else if (b > a) {
        events.push({ type: 'restock', at, id: p.id, name: nameOf(p.id), units: b - a, revenue: 0 });
      }
    }
  }

  // Agregados por día
  const byDayMap = new Map();
  for (const e of events) {
    if (e.type !== 'venta') continue;
    const d = dayOf(e.at);
    const row = byDayMap.get(d) || { day: d, units: 0, revenue: 0, orders: 0 };
    row.units += e.units;
    row.revenue += e.revenue;
    row.orders += 1;
    byDayMap.set(d, row);
  }
  const byDay = [...byDayMap.values()].sort((x, y) => x.day.localeCompare(y.day));

  // Agregados por producto
  const byProdMap = new Map();
  for (const e of events) {
    if (e.type !== 'venta') continue;
    const m = meta.get(e.id) || {};
    const row = byProdMap.get(e.id) || {
      id: e.id, name: e.name, sku: m.sku, categories: m.categories, units: 0, revenue: 0,
    };
    row.units += e.units;
    row.revenue += e.revenue;
    byProdMap.set(e.id, row);
  }
  const byProduct = [...byProdMap.values()].sort((x, y) => y.units - x.units);

  // Agregados por mes (YYYY-MM)
  const byMonthMap = new Map();
  for (const r of byDay) {
    const month = r.day.slice(0, 7);
    const row = byMonthMap.get(month) || { month, units: 0, revenue: 0, orders: 0 };
    row.units += r.units;
    row.revenue += r.revenue;
    row.orders += r.orders;
    byMonthMap.set(month, row);
  }
  const byMonth = [...byMonthMap.values()].sort((x, y) => x.month.localeCompare(y.month));

  // Agregados por categoría (una venta puede sumar a varias categorías)
  const byCatMap = new Map();
  for (const e of events) {
    if (e.type !== 'venta') continue;
    for (const c of e.categories || []) {
      const row = byCatMap.get(c) || { name: c, units: 0, revenue: 0 };
      row.units += e.units;
      row.revenue += e.revenue;
      byCatMap.set(c, row);
    }
  }
  const byCategory = [...byCatMap.values()].sort((x, y) => y.units - x.units);

  const totals = { units: 0, revenue: 0, restockUnits: 0 };
  for (const e of events) {
    if (e.type === 'venta') { totals.units += e.units; totals.revenue += e.revenue; }
    else if (e.type === 'restock') totals.restockUnits += e.units;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    snapshotCount: snaps.length,
    firstCapture: snaps[0].capturedAt,
    lastCapture: snaps[snaps.length - 1].capturedAt,
    hasSales: byDay.length > 0,
    isDemo: snaps.some((s) => s.file.includes('demo')),
    events: events.slice(-10000),
    byDay,
    byMonth,
    byCategory,
    byProduct,
    totals,
  };
  await writeFile(join(DATA_DIR, 'sales-inferred.json'), JSON.stringify(out));

  return {
    message: `${byProduct.length} productos con ventas · ${totals.units} uds · Q${totals.revenue.toFixed(0)}`,
    ...totals,
  };
}

// Historial unificado: 1 punto por día (el último del día), últimos HISTORY_DAYS días.
async function writeHistory(snaps) {
  // Para cada producto guardamos el último snapshot de cada día.
  const perDay = new Map(); // id -> Map(day -> {at, stock, price})
  for (const s of snaps) {
    const day = dayOf(s.capturedAt);
    for (const p of s.products) {
      if (!perDay.has(p.id)) perDay.set(p.id, new Map());
      perDay.get(p.id).set(day, { at: s.capturedAt, stock: p.stock, price: p.price });
    }
  }
  const history = {};
  for (const [id, dayMap] of perDay) {
    const arr = [...dayMap.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-HISTORY_DAYS);
    history[id] = arr;
  }
  await writeFile(join(DATA_DIR, 'history.json'), JSON.stringify(history));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runInference()
    .then((r) => console.log('✓', r.message))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
