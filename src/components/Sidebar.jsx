import { NavLink } from 'react-router-dom';

const ICONS = {
  dashboard: (
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  ),
  ventas: (
    <path d="M3 3v18h18v-2H5V3H3zm4 12h2v-5H7v5zm4 0h2V7h-2v8zm4 0h2v-3h-2v3z" />
  ),
  inventario: (
    <path d="M20 2H4c-1.1 0-2 .9-2 2v4h2V4h16v16H4v-4H2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM2 10v2h10.5l-2.3 2.3 1.4 1.4L16.8 11l-5.2-5.2-1.4 1.4L12.5 10H2z" />
  ),
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      {ICONS[name]}
    </svg>
  );
}

const items = [
  { to: '/', name: 'dashboard', label: 'Dashboard', end: true },
  { to: '/ventas', name: 'ventas', label: 'Ventas' },
  { to: '/inventario', name: 'inventario', label: 'Inventario' },
];

export default function Sidebar({ capturedAt }) {
  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="px-5 py-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold">
            B
          </div>
          <div>
            <div className="font-bold leading-tight text-slate-900 dark:text-white">Beauty Depot</div>
            <div className="text-xs text-slate-400">Panel de inventario</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon name={it.name} />
            {it.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
        {capturedAt ? (
          <>
            <div className="font-medium text-slate-500 dark:text-slate-400">Última captura</div>
            <div>{new Date(capturedAt).toLocaleString('es-GT')}</div>
          </>
        ) : (
          <div>Sin datos aún</div>
        )}
      </div>
    </aside>
  );
}
