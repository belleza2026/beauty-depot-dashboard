// Scraper principal: baja el catálogo de Beauty Depot, resuelve el stock exacto,
// guarda un snapshot con marca de tiempo y actualiza products-latest.json + categories.json.
// Al final invoca la inferencia de ventas.
//
// Uso:
//   node scripts/scrape.mjs                 -> scrape completo (2013 productos)
//   MAX_PAGES=2 node scripts/scrape.mjs     -> scrape parcial (para desarrollo/pruebas)

import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchCatalog, fetchCategories, resolveExactStock } from './lib/wooStore.mjs';
import { DATA_DIR, SNAP_DIR } from './lib/paths.mjs';
import { runInference } from './inferSales.mjs';

function timestamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(
    d.getMinutes()
  )}`;
}

async function main() {
  const startedAt = new Date();
  const maxPages = process.env.MAX_PAGES ? Number(process.env.MAX_PAGES) : null;
  await mkdir(SNAP_DIR, { recursive: true });

  console.log('→ Fase 1: bajando catálogo (Store API)...');
  let { products, total } = await fetchCatalog({
    onProgress: ({ page, totalPages }) => {
      if (page % 5 === 0 || page === totalPages) console.log(`   catálogo ${page}/${totalPages}`);
    },
  });

  if (maxPages) {
    products = products.slice(0, maxPages * 100);
    console.log(`   (MAX_PAGES=${maxPages}) recortado a ${products.length} productos para pruebas`);
  }

  console.log(`→ Fase 2: resolviendo stock exacto de ${products.length} productos...`);
  await resolveExactStock(products, {
    concurrency: process.env.SCRAPE_CONCURRENCY ? Number(process.env.SCRAPE_CONCURRENCY) : 5,
    delayMs: process.env.SCRAPE_DELAY_MS ? Number(process.env.SCRAPE_DELAY_MS) : 120,
    onProgress: ({ done, total }) => console.log(`   stock ${done}/${total} (páginas HTML)`),
  });

  console.log('→ Bajando categorías...');
  const categories = await fetchCategories().catch(() => []);

  const capturedAt = startedAt.toISOString();
  // Snapshot "delgado": solo lo necesario para inferir ventas e historial.
  // (Los campos de despliegue —nombre, imagen, etc.— viven en products-latest.json.)
  const slim = products.map((p) => ({
    id: p.id,
    stock: p.stock,
    price: p.price,
    isInStock: p.isInStock,
  }));
  const snapshot = {
    capturedAt,
    source: 'beautydepot.com.gt',
    productCount: products.length,
    totalReported: total,
    products: slim,
  };

  const stamp = timestamp(startedAt);
  const snapPath = join(SNAP_DIR, `${stamp}.json`);
  await writeFile(snapPath, JSON.stringify(snapshot));
  console.log(`✓ Snapshot guardado: ${snapPath}`);

  // Poda: conserva solo los últimos N snapshots para no inflar el repositorio.
  const keep = process.env.KEEP_SNAPSHOTS ? Number(process.env.KEEP_SNAPSHOTS) : 90;
  const snaps = (await readdir(SNAP_DIR)).filter((f) => f.endsWith('.json')).sort();
  const toDelete = snaps.slice(0, Math.max(0, snaps.length - keep));
  for (const f of toDelete) await rm(join(SNAP_DIR, f));
  if (toDelete.length) console.log(`   podados ${toDelete.length} snapshots antiguos (conservando ${keep})`);

  // products-latest.json: versión ligera para el dashboard.
  const latest = {
    capturedAt,
    productCount: products.length,
    products,
  };
  await writeFile(join(DATA_DIR, 'products-latest.json'), JSON.stringify(latest));
  await writeFile(join(DATA_DIR, 'categories.json'), JSON.stringify(categories));
  console.log('✓ products-latest.json y categories.json actualizados');

  const withStock = products.filter((p) => typeof p.stock === 'number');
  const units = withStock.reduce((s, p) => s + p.stock, 0);
  const value = withStock.reduce((s, p) => s + (p.price || 0) * p.stock, 0);
  console.log(
    `   Resumen: ${products.length} productos · ${units.toLocaleString('es-GT')} unidades · valor Q${value.toLocaleString(
      'es-GT',
      { maximumFractionDigits: 0 }
    )}`
  );

  console.log('→ Inferencia de ventas...');
  const salesSummary = await runInference();
  console.log(`✓ ${salesSummary.message}`);

  console.log(`\n✅ Listo en ${((Date.now() - startedAt) / 1000).toFixed(0)}s`);
}

main().catch((err) => {
  console.error('✗ Error en el scrape:', err);
  process.exit(1);
});
