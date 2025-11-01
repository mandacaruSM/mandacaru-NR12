'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface StatCard {
  title: string;
  value: string;
  change: string;
  href: string;
  icon: string;
  changeType: 'positive' | 'negative' | 'neutral';
  color: string;
}

interface Activity {
  id: number;
  action: string;
  detail: string;
  time: string;
  icon: string;
  color: string;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const stats: StatCard[] = [
    {
      title: 'Total de Clientes',
      value: '42',
      change: '+3 este mês',
      href: '/dashboard/clientes',
      icon: '👥',
      changeType: 'positive',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Equipamentos Ativos',
      value: '127',
      change: '+12 este mês',
      href: '/dashboard/equipamentos',
      icon: '🚜',
      changeType: 'positive',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Operadores Ativos',
      value: '24',
      change: '+2 este mês',
      href: '/dashboard/operadores',
      icon: '👷',
      changeType: 'positive',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'Supervisores',
      value: '8',
      change: 'Estável',
      href: '/dashboard/supervisores',
      icon: '👨‍💼',
      changeType: 'neutral',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Manutenções Pendentes',
      value: '8',
      change: '-2 esta semana',
      href: '/dashboard/manutencoes',
      icon: '🔧',
      changeType: 'neutral',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      title: 'OS Abertas',
      value: '15',
      change: '+5 hoje',
      href: '/dashboard/os',
      icon: '📝',
      changeType: 'negative',
      color: 'from-red-500 to-red-600',
    },
  ];

  const recentActivities: Activity[] = [
    {
      id: 1,
      action: 'Novo cliente cadastrado',
      detail: 'Construtora ABC Ltda',
      time: '5 min atrás',
      icon: '👥',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 2,
      action: 'Manutenção concluída',
      detail: 'Equipamento EQ-001',
      time: '1h atrás',
      icon: '✅',
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 3,
      action: 'OS criada',
      detail: 'Reparo urgente - EQ-045',
      time: '2h atrás',
      icon: '📝',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 4,
      action: 'Abastecimento registrado',
      detail: 'Caminhão CAM-12 - 150L',
      time: '3h atrás',
      icon: '⛽',
      color: 'bg-orange-100 text-orange-600'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Olá, {user?.username}!
            </h1>
            <p className="text-blue-100 text-lg">
              Bem-vindo ao sistema de gestão NR12
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-blue-100">Hoje</p>
              <p className="text-xl font-semibold">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl shadow-md`}>
                  {stat.icon}
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
              <div className="flex items-center">
                <span
                  className={`text-xs font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600 bg-green-50'
                      : stat.changeType === 'negative'
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-50'
                  } px-2 py-1 rounded-full`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
              <Link
                href="#"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todas
              </Link>
            </div>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg ${activity.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg">{activity.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{activity.detail}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/dashboard/clientes/novo"
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <span className="text-2xl">👥</span>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-center">
                  Novo Cliente
                </span>
              </Link>
              <Link
                href="/dashboard/equipamentos/novo"
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <span className="text-2xl">🚜</span>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-center">
                  Novo Equipamento
                </span>
              </Link>
              <Link
                href="/dashboard/operadores/novo"
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-indigo-100 group-hover:bg-indigo-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <span className="text-2xl">👷</span>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 text-center">
                  Novo Operador
                </span>
              </Link>
              <Link
                href="/dashboard/supervisores/novo"
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-purple-100 group-hover:bg-purple-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <span className="text-2xl">👨‍💼</span>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700 text-center">
                  Novo Supervisor
                </span>
              </Link>
              <Link
                href="/dashboard/manutencoes/novo"
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-yellow-500 hover:bg-yellow-50 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-yellow-100 group-hover:bg-yellow-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <span className="text-2xl">🔧</span>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-yellow-700 text-center">
                  Nova Manutenção
                </span>
              </Link>
              <Link
                href="/dashboard/nr12/checklists/novo"
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-pink-100 group-hover:bg-pink-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <span className="text-2xl">📋</span>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-pink-700 text-center">
                  Novo Checklist NR12
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                Atenção necessária!
              </h3>
              <p className="text-sm text-yellow-800">
                Você tem 3 equipamentos com manutenção atrasada.
              </p>
              <Link
                href="/dashboard/manutencoes"
                className="inline-flex items-center mt-2 text-sm font-medium text-yellow-900 hover:text-yellow-700"
              >
                Ver detalhes
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}