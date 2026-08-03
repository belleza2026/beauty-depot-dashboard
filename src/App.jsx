import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import Inventario from './pages/Inventario';
import ProductoDetalle from './pages/ProductoDetalle';
import { useProducts } from './lib/useData';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  const { data } = useProducts();
  return (
    <div className="flex min-h-screen">
      <Sidebar capturedAt={data?.capturedAt} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur sticky top-0 z-10">
          <div className="text-sm text-slate-400">
            {data ? `${data.productCount.toLocaleString('es-GT')} productos monitoreados` : 'Cargando…'}
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/producto/:id" element={<ProductoDetalle />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
