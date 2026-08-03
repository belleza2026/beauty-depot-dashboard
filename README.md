# Beauty Depot · Dashboard de Inventario

Panel para rastrear el inventario de **Beauty Depot** (beautydepot.com.gt): catálogo
completo con nombre, precio, SKU y **cantidad exacta en stock**, más **ventas estimadas**
inferidas a partir de los cambios de inventario entre capturas.

Menú lateral con tres secciones — **Dashboard**, **Ventas** e **Inventario** — y una
**vista de detalle** al hacer clic en cualquier producto.

---

## Requisitos

- **Node.js** (instalado con `nvm`). Si abres una terminal nueva y `node` no se reconoce,
  ejecuta primero:
  ```bash
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
  ```
  (Ya se agregó esto a `~/.zshrc`, así que en terminales nuevas debería cargarse solo.)

## Puesta en marcha

```bash
cd beauty-depot-dashboard
npm install          # solo la primera vez
npm run scrape       # baja el inventario real (~10-15 min, 2013 productos)
npm run dev          # abre el dashboard en http://localhost:5173
```

## Cómo funciona

### 1. Scraper — `npm run scrape`
Baja el catálogo desde la **WooCommerce Store API** pública del sitio y resuelve la
**cantidad exacta** de cada producto:
- Si el API expone `low_stock_remaining` (stock ≤ 2), usa ese valor.
- Si no, lee la página del producto y extrae `N disponibles` del HTML.

Genera:
- `public/data/products-latest.json` — inventario actual (lo que muestra el dashboard).
- `public/data/categories.json` — categorías.
- `public/data/snapshots/<fecha>.json` — una **captura con fecha** por cada corrida.

Para desarrollo rápido: `MAX_PAGES=2 npm run scrape` (solo ~200 productos).

### 2. Ventas estimadas
Cada vez que corre el scraper compara la captura nueva con las anteriores. Una caída de
stock entre dos capturas = **unidades vendidas** (estimadas); el ingreso usa el precio
vigente. Los resultados quedan en `public/data/sales-inferred.json` y en
`public/data/history/<id>.json` (serie por producto).

> ⚠️ **Se necesitan al menos 2 capturas** para que aparezcan ventas. Corre el scraper
> **periódicamente** (diario recomendado) para acumular historia.

### 3. Datos de demostración — `npm run seed-demo`
Genera 14 capturas de ejemplo retrodatadas a partir de la última captura real, para ver
el dashboard con ventas pobladas antes de acumular capturas reales. Se marcan como
**"modo demostración"** en la interfaz. Al correr `npm run scrape` a diario, las ventas
reales las van reemplazando.

## Automatizar el scraping diario (opcional)

Con `cron` (ejemplo: todos los días a las 7:00 am):
```bash
crontab -e
# agrega esta línea (ajusta la ruta):
0 7 * * * export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; cd "$HOME/Library/CloudStorage/OneDrive-Personal/beauty-depot-dashboard" && npm run scrape >> scrape.log 2>&1
```

## Limitaciones (importante)

- **Inventario: exacto.** La cantidad por producto se reconstruye del API + la página de
  cada producto. Si la tienda desactivara "mostrar existencias", habría que usar una
  llave de API de WooCommerce (solo-lectura) del cliente.
- **Ventas: estimadas.** El conteo de unidades entre capturas es exacto, pero un descenso
  de stock se *asume* venta; podría deberse a un ajuste manual o merma. Por eso la UI las
  etiqueta siempre como "estimadas".
- La granularidad de ventas depende de la frecuencia del scraping.

## Estructura

```
scripts/
  scrape.mjs         # baja catálogo + stock exacto
  inferSales.mjs     # diff de capturas -> ventas
  seedDemo.mjs       # capturas de ejemplo
  lib/wooStore.mjs   # cliente del Store API + parseo de stock
src/
  pages/             # Dashboard, Ventas, Inventario, ProductoDetalle
  components/         # Sidebar, tabla, gráficas, tarjetas KPI
public/data/         # JSON generados por el scraper
```

## Build para producción

```bash
npm run build        # genera dist/ (estático, desplegable en cualquier hosting)
npm run preview      # previsualiza el build
```
Como es 100% estático, se puede desplegar en Netlify, Vercel, GitHub Pages, etc.
Recuerda incluir la carpeta `public/data` con los JSON generados.
