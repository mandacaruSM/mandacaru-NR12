// frontend/src/app/dashboard/layout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';

interface MenuItem {
  name: string;
  href: string;
  module: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', module: '', icon: '📊' },
  { name: 'Clientes', href: '/dashboard/clientes', module: 'clientes', icon: '👥' },
  { name: 'Empreendimentos', href: '/dashboard/empreendimentos', module: 'empreendimentos', icon: '🏗️' },
  { name: 'Equipamentos', href: '/dashboard/equipamentos', module: 'equipamentos', icon: '🚜' },
  { name: 'NR12', href: '/dashboard/nr12', module: 'nr12', icon: '📋' },
  { name: 'Manutenções', href: '/dashboard/manutencoes', module: 'manutencoes', icon: '🔧' },
  { name: 'Abastecimentos', href: '/dashboard/abastecimentos', module: 'abastecimentos', icon: '⛽' },
  { name: 'Almoxarifado', href: '/dashboard/almoxarifado', module: 'almoxarifado', icon: '📦' },
  { name: 'Ordens de Serviço', href: '/dashboard/os', module: 'os', icon: '📝' },
  { name: 'Orçamentos', href: '/dashboard/orcamentos', module: 'orcamentos', icon: '💰' },
  { name: 'Compras', href: '/dashboard/compras', module: 'compras', icon: '🛒' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, hasModule } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredMenu = menuItems.filter(
    (item) => !item.module || hasModule(item.module)
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <h1 className="text-xl font-bold text-gray-800">ERP System</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              ✕
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {filteredMenu.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.profile.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Sair"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {menuItems.find((item) => item.href === pathname)?.name || 'Dashboard'}
          </h2>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}