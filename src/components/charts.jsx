// Gráficas del dashboard (Recharts) con la paleta validada de la skill dataviz.
// Regla aplicada: cada gráfica muestra UNA medida -> un solo tono (azul secuencial),
// nunca arcoíris. Ejes/grid recesivos. Tooltip en todas.
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Q, Qcompact, num } from '../lib/format';

// Paleta validada (dataviz/references/palette.md)
export const PALETTE = {
  blue: '#2a78d6',
  blueLight: '#9ec5f4',
  aqua: '#1baf7a',
  amber: '#eda100',
  rose: '#e34948',
  grid: '#e1e0d9',
  gridDark: '#2c2c2a',
  axis: '#898781',
};

const isDark = () => document.documentElement.classList.contains('dark');

function ChartTooltip({ active, payload, label, valueFmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1 max-w-[220px] truncate">
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="text-slate-500 dark:text-slate-400 tabular-nums">
          {p.name}: <span className="font-semibold text-slate-700 dark:text-slate-200">{valueFmt ? valueFmt(p.value) : num(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SalesTrend({ data, metric = 'units' }) {
  const grid = isDark() ? PALETTE.gridDark : PALETTE.grid;
  const fmt = metric === 'revenue' ? Q : num;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.blue} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PALETTE.blue} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="day" tick={{ fill: PALETTE.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: grid }} />
        <YAxis
          tick={{ fill: PALETTE.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => (metric === 'revenue' ? Qcompact(v) : num(v))}
        />
        <Tooltip content={<ChartTooltip valueFmt={fmt} />} />
        <Area
          type="monotone"
          dataKey={metric}
          name={metric === 'revenue' ? 'Ingreso est.' : 'Unidades'}
          stroke={PALETTE.blue}
          strokeWidth={2}
          fill="url(#salesFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Barras horizontales de magnitud (una medida) — un solo tono azul.
export function MagnitudeBars({ data, dataKey = 'value', nameKey = 'name', valueFmt = num, height = 300, highlightMax = true }) {
  const grid = isDark() ? PALETTE.gridDark : PALETTE.grid;
  const max = Math.max(...data.map((d) => d[dataKey]), 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: PALETTE.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={valueFmt} />
        <YAxis
          type="category"
          dataKey={nameKey}
          tick={{ fill: PALETTE.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={150}
          tickFormatter={(v) => (v.length > 22 ? v.slice(0, 21) + '…' : v)}
        />
        <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip valueFmt={valueFmt} />} />
        <Bar dataKey={dataKey} name="Valor" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={highlightMax && d[dataKey] === max ? PALETTE.blue : PALETTE.blueLight} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Distribución (histograma) de una medida — un solo tono.
export function DistributionBars({ data, dataKey = 'count', nameKey = 'label', height = 240 }) {
  const grid = isDark() ? PALETTE.gridDark : PALETTE.grid;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey={nameKey} tick={{ fill: PALETTE.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: grid }} />
        <YAxis tick={{ fill: PALETTE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip valueFmt={num} />} />
        <Bar dataKey={dataKey} name="Productos" fill={PALETTE.blue} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
