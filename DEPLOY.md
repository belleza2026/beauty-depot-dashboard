# Deploy — Dashboard en la nube (gratis, con GitHub Pages)

El dashboard corre solo en la nube: **GitHub Actions** ejecuta el scraper **cada 3 horas**
y **GitHub Pages** publica el dashboard en un link. Todo gratis para repositorios públicos.

## Qué hace cada corrida automática

1. Baja el inventario de beautydepot.com.gt (cantidad exacta de cada producto).
2. Guarda una "captura" con fecha en el repo (así se acumula historial para las ventas).
3. Reconstruye las ventas estimadas comparando capturas.
4. Reconstruye y publica el dashboard en el link de Pages.

Con **2 o más capturas** empiezan a aparecer ventas reales. A cada 3 h, eso ocurre el
mismo día.

---

## Puesta en marcha (una sola vez, ~5 minutos)

### 1. Crear el repositorio en GitHub
- Entra a https://github.com/new
- Nombre sugerido: `beauty-depot-dashboard`
- Visibilidad: **Public** (para que sea 100% gratis)
- **No** agregues README/licencia (ya existen aquí). Crea el repo vacío.

### 2. Subir el proyecto
Desde una terminal, en la carpeta del proyecto:

```bash
cd ~/Library/CloudStorage/OneDrive-Personal/beauty-depot-dashboard
git remote add origin https://github.com/<TU-USUARIO>/beauty-depot-dashboard.git
git branch -M main
git push -u origin main
```
(El commit inicial ya está hecho; solo falta enlazar tu repo y subir.)

### 3. Activar GitHub Pages
- En el repo: **Settings → Pages**.
- En **Build and deployment → Source**, elige **GitHub Actions**.

### 4. Activar el permiso de escritura del workflow
- **Settings → Actions → General → Workflow permissions**.
- Marca **Read and write permissions** y guarda.
  (Esto deja que el scraper guarde las capturas en el repo.)

### 5. Correr la primera vez
- Ve a la pestaña **Actions → “Scrape & Deploy” → Run workflow**.
- Al terminar (unos minutos), tu dashboard estará en:
  `https://<TU-USUARIO>.github.io/beauty-depot-dashboard/`

¡Listo! A partir de ahí corre solo cada 3 horas.

---

## Ajustes comunes

**Cambiar la frecuencia:** edita `.github/workflows/deploy.yml`, línea del `cron`:
- Cada hora: `0 * * * *`
- Cada 6 horas: `0 */6 * * *`
- Dos veces al día (6am y 6pm UTC): `0 6,18 * * *`

**Cuántas capturas se conservan:** por defecto 90 (variable `KEEP_SNAPSHOTS`). El historial
del dashboard guarda los últimos 60 días (1 punto por día).

**Velocidad del scraper:** `SCRAPE_CONCURRENCY` (por defecto 8 en la nube) y
`SCRAPE_DELAY_MS` (60). Subir la concurrencia lo acelera pero carga más el sitio del cliente.

---

## Notas
- Como es un repo público, el catálogo, precios y ventas estimadas quedan visibles en
  GitHub. Si en el futuro necesitas que sean privados, se puede migrar a un repo privado
  (GitHub Actions privado da 2000 min/mes gratis; a cada 3 h alcanza de sobra).
- GitHub Actions programado puede retrasarse algunos minutos cuando la plataforma está
  cargada; no corre siempre al minuto exacto. Para inventario/ventas esto no afecta.
