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

  // Cadastros
  { name: 'Clientes', href: '/dashboard/clientes', module: 'clientes', icon: '👥' },
  { name: 'Empreendimentos', href: '/dashboard/empreendimentos', module: 'empreendimentos', icon: '🏗️' },

  // Equipamentos
  { name: 'Equipamentos', href: '/dashboard/equipamentos', module: 'equipamentos', icon: '🚜' },
  { name: 'Tipos de Equipamento', href: '/dashboard/tipos-equipamento', module: 'equipamentos', icon: '🏷️' },

  // Operações
  { name: 'Manutenções', href: '/dashboard/manutencoes', module: 'manutencoes', icon: '🔧' },
  { name: 'Abastecimentos', href: '/dashboard/abastecimentos', module: 'abastecimentos', icon: '⛽' },
  { name: 'NR12', href: '/dashboard/nr12', module: 'nr12', icon: '📋' },

  // Pessoas
  { name: 'Técnicos', href: '/dashboard/tecnicos', module: '', icon: '👨‍🔧' },
  { name: 'Operadores', href: '/dashboard/operadores', module: '', icon: '👷' },
  { name: 'Supervisores', href: '/dashboard/supervisores', module: '', icon: '👨‍💼' },

  // Gestão
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NR</span>
              </div>
              <h1 className="ml-3 text-lg font-bold text-gray-900">NR12 ERP</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Fechar menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {filteredMenu.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-xl mr-3">{item.icon}</span>
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                  <p className="text-xs text-gray-500 truncate capitalize">{user.profile.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Sair"
                aria-label="Sair do sistema"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                aria-label="Abrir menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {menuItems.find((item) => item.href === pathname)?.name || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <div className="hidden sm:block text-sm text-gray-600">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
