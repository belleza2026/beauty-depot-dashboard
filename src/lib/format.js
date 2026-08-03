// Utilidades de formato para el dashboard.

export const Q = (n) =>
  n == null || Number.isNaN(n)
    ? '—'
    : new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        maximumFractionDigits: 2,
      }).format(n);

export const Qcompact = (n) =>
  n == null
    ? '—'
    : 'Q' +
      new Intl.NumberFormat('es-GT', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const num = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-GT').format(n);

export const fecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-GT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

// Clasificación de stock -> etiqueta y color.
export function stockLevel(stock, isInStock) {
  if (stock === 0 || isInStock === false) return { key: 'out', label: 'Agotado' };
  if (stock == null) return { key: 'unknown', label: 'Sin dato' };
  if (stock <= 2) return { key: 'low', label: 'Bajo' };
  if (stock <= 5) return { key: 'mid', label: 'Medio' };
  return { key: 'ok', label: 'En stock' };
}
