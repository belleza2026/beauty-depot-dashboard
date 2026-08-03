// Genera capturas (snapshots) de DEMOSTRACIÓN retrodatadas a partir del snapshot real
// más reciente, para poder ver el dashboard con ventas pobladas antes de acumular
// capturas reales. Los archivos llevan "demo" en el nombre y activan el aviso de
// "modo demostración" en la UI. Al correr `npm run scrape` a diario se acumulan capturas
// REALES y estas de demo dejan de dominar.
//
// Uso: npm run seed-demo   (requiere haber corrido antes `npm run scrape`)

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SNAP_DIR } from './lib/paths.mjs';
import { runInference } from './inferSales.mjs';

const DAYS = 14; // capturas hacia atrás
const rand = (n) => Math.floor(Math.random() * n);

function stamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function main() {
  const files = (await readdir(SNAP_DIR)).filter((f) => f.endsWith('.json') && !f.includes('demo'));
  if (!files.length) {
    console.error('No hay snapshot real. Corre primero: npm run scrape');
    process.exit(1);
  }
  files.sort();
  const base = JSON.parse(await readFile(join(SNAP_DIR, files[files.length - 1]), 'utf8'));

  // Reconstruye hacia atrás: el stock "hace N días" era mayor (se fue vendiendo).
  // Partimos del stock actual y vamos SUMANDO ventas diarias plausibles al retroceder.
  let current = base.products.map((p) => ({ ...p }));
  const backSnaps = [];
  for (let day = 1; day <= DAYS; day++) {
    const prev = current.map((p) => {
      let stock = typeof p.stock === 'number' ? p.stock : 0;
      // ~35% de los productos tuvieron alguna venta ese día
      if (stock >= 0 && Math.random() < 0.35) {
        const sold = 1 + rand(Math.min(3, stock + 2));
        stock = stock + sold; // hacia atrás había más stock
      }
      return { ...p, stock, isInStock: stock > 0 ? true : p.isInStock };
    });
    const d = new Date(base.capturedAt);
    d.setDate(d.getDate() - day);
    d.setHours(6, 0, 0, 0);
    backSnaps.push({ capturedAt: d.toISOString(), products: prev });
    current = prev;
  }
  backSnaps.reverse(); // de más antiguo a más reciente

  for (const s of backSnaps) {
    const d = new Date(s.capturedAt);
    const name = `${stamp(d)}-demo.json`;
    await writeFile(
      join(SNAP_DIR, name),
      JSON.stringify({ capturedAt: s.capturedAt, source: 'demo', productCount: s.products.length, products: s.products })
    );
  }
  console.log(`✓ ${backSnaps.length} capturas demo generadas`);

  const r = await runInference();
  console.log('✓ Inferencia:', r.message);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
