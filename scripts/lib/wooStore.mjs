// Cliente del WooCommerce Store API de beautydepot.com.gt + extracción de stock exacto.
//
// Estrategia híbrida (verificada contra el sitio real):
//   1) /wp-json/wc/store/v1/products  -> catálogo (nombre, sku, precios, categorías, imagen).
//      El API oculta stock_quantity (=null), pero trae low_stock_remaining con el valor
//      EXACTO cuando el stock es <= umbral de la tienda (2).
//   2) Para productos con low_stock_remaining == null (stock alto) se baja la página HTML
//      del producto y se parsea <p class="stock in-stock">N disponibles</p> -> cantidad exacta.

export const BASE_URL = 'https://beautydepot.com.gt';
const STORE_API = `${BASE_URL}/wp-json/wc/store/v1`;

const UA =
  'BeautyDepotInventoryDashboard/1.0 (+monitoreo de inventario para el cliente Beauty Depot)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, { retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      const data = await res.json();
      return { data, headers: res.headers };
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(500 * (attempt + 1));
    }
  }
}

async function fetchText(url, { retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(500 * (attempt + 1));
    }
  }
}

// Decodifica entidades HTML en los títulos que devuelve WooCommerce
// (ej. &#8243; -> ″, &#8211; -> –, &amp; -> &).
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
  uuml: 'ü', Uuml: 'Ü', ordf: 'ª', ordm: 'º', deg: '°', hellip: '…',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ndash: '–', mdash: '—',
};
function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in NAMED ? NAMED[n] : m))
    .trim();
}

// Convierte el precio en unidades menores ("19000" con minor_unit 2) a número (190.0).
function toMoney(minorStr, minorUnit) {
  if (minorStr == null) return null;
  const n = Number(minorStr);
  if (Number.isNaN(n)) return null;
  return n / 10 ** (minorUnit ?? 2);
}

function normalizeProduct(p) {
  const minor = p.prices?.currency_minor_unit ?? 2;
  const price = toMoney(p.prices?.price, minor);
  const regular = toMoney(p.prices?.regular_price, minor);
  const sale = toMoney(p.prices?.sale_price, minor);
  const onSale = sale != null && regular != null && sale < regular;
  return {
    id: p.id,
    name: decodeEntities(p.name || ''),
    sku: (p.sku || '').trim(),
    permalink: p.permalink,
    image: p.images?.[0]?.src || null,
    price: onSale ? sale : price ?? regular,
    regularPrice: regular,
    salePrice: onSale ? sale : null,
    onSale,
    discountPct: onSale && regular ? Math.round((1 - sale / regular) * 100) : 0,
    categories: (p.categories || []).map((c) => decodeEntities(c.name)),
    isInStock: !!p.is_in_stock,
    lowStockRemaining: p.low_stock_remaining ?? null,
    currency: p.prices?.currency_code || 'GTQ',
    // stock exacto se completa después (fase 2)
    stock: null,
    stockSource: null,
  };
}

// Fase 1: baja el catálogo completo paginando el Store API.
export async function fetchCatalog({ perPage = 100, delayMs = 250, onProgress } = {}) {
  const first = await fetchJson(`${STORE_API}/products?per_page=${perPage}&page=1`);
  const totalPages = Number(first.headers.get('x-wp-totalpages')) || 1;
  const total = Number(first.headers.get('x-wp-total')) || first.data.length;
  const products = first.data.map(normalizeProduct);
  onProgress?.({ phase: 'catalog', page: 1, totalPages, total });

  for (let page = 2; page <= totalPages; page++) {
    await sleep(delayMs);
    const { data } = await fetchJson(`${STORE_API}/products?per_page=${perPage}&page=${page}`);
    products.push(...data.map(normalizeProduct));
    onProgress?.({ phase: 'catalog', page, totalPages, total });
  }
  return { products, total };
}

export async function fetchCategories() {
  const { data } = await fetchJson(`${STORE_API}/products/categories?per_page=100`);
  return data.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }));
}

// Extrae "N disponibles" del HTML de la página de producto.
const STOCK_RE = /<p[^>]*class="[^"]*\bstock\b[^"]*"[^>]*>\s*([\d.,]+)\s*disponibles?/i;
function parseStockFromHtml(html) {
  const m = html.match(STOCK_RE);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

async function fetchExactStock(product) {
  const html = await fetchText(product.permalink);
  const n = parseStockFromHtml(html);
  return n;
}

// Fase 2: completa `stock` exacto de cada producto.
//   - low_stock_remaining != null  -> ese es el valor exacto (sin request extra).
//   - agotado                       -> 0.
//   - resto                         -> parsea la página HTML del producto (concurrencia limitada).
export async function resolveExactStock(products, { concurrency = 5, delayMs = 120, onProgress } = {}) {
  const needsHtml = [];
  for (const p of products) {
    if (!p.isInStock) {
      p.stock = 0;
      p.stockSource = 'api-out-of-stock';
    } else if (p.lowStockRemaining != null) {
      p.stock = p.lowStockRemaining;
      p.stockSource = 'api-low-stock';
    } else {
      needsHtml.push(p);
    }
  }

  let done = 0;
  const total = needsHtml.length;
  let idx = 0;
  async function worker() {
    while (idx < needsHtml.length) {
      const p = needsHtml[idx++];
      try {
        const n = await fetchExactStock(p);
        if (n != null) {
          p.stock = n;
          p.stockSource = 'html';
        } else {
          // En stock pero sin número visible: fallback conservador.
          p.stock = null;
          p.stockSource = 'html-unparsed';
        }
      } catch {
        p.stock = null;
        p.stockSource = 'html-error';
      }
      done++;
      if (done % 25 === 0 || done === total) onProgress?.({ phase: 'stock', done, total });
      await sleep(delayMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total || 1) }, worker));
  return products;
}
