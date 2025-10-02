// frontend/src/app/dashboard/page.tsx
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
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Dados mockados - substituir por chamadas reais à API
  const stats: StatCard[] = [
    {
      title: 'Total de Clientes',
      value: '42',
      change: '+3 este mês',
      href: '/dashboard/clientes',
      icon: '👥',
      changeType: 'positive',
    },
    {
      title: 'Equipamentos Ativos',
      value: '127',
      change: '+12 este mês',
      href: '/dashboard/equipamentos',
      icon: '🚜',
      changeType: 'positive',
    },
    {
      title: 'Manutenções Pendentes',
      value: '8',
      change: '-2 esta semana',
      href: '/dashboard/manutencoes',
      icon: '🔧',
      changeType: 'neutral',
    },
    {
      title: 'OS Abertas',
      value: '15',
      change: '+5 hoje',
      href: '/dashboard/os',
      icon: '📝',
      changeType: 'negative',
    },
  ];

  const recentActivities = [
    { id: 1, action: 'Novo cliente cadastrado', detail: 'Construtora ABC Ltda', time: '5 min atrás', icon: '👥' },
    { id: 2, action: 'Manutenção concluída', detail: 'Equipamento EQ-001', time: '1h atrás', icon: '✅' },
    { id: 3, action: 'OS criada', detail: 'Reparo urgente - EQ-045', time: '2h atrás', icon: '📝' },
    { id: 4, action: 'Abastecimento registrado', detail: 'Caminhão CAM-12 - 150L', time: '3h atrás', icon: '⛽' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bem-vindo, {user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">
          Aqui está um resumo das suas atividades hoje
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p
                  className={`text-sm mt-2 ${
                    stat.changeType === 'positive'
                      ? 'text-green-600'
                      : stat.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div className="text-4xl">{stat.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex items-start">
                  <span className="text-2xl mr-3">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.detail}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/dashboard/clientes"
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-3xl mb-2">➕</span>
                <span className="text-sm font-medium text-gray-700">Novo Cliente</span>
              </Link>
              <Link
                href="/dashboard/equipamentos"
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-3xl mb-2">🚜</span>
                <span className="text-sm font-medium text-gray-700">Novo Equipamento</span>
              </Link>
              <Link
                href="/dashboard/os"
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-3xl mb-2">📝</span>
                <span className="text-sm font-medium text-gray-700">Nova OS</span>
              </Link>
              <Link
                href="/dashboard/manutencoes"
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-3xl mb-2">🔧</span>
                <span className="text-sm font-medium text-gray-700">Nova Manutenção</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <span className="text-2xl mr-3">⚠️</span>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Atenção!</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Você tem 3 equipamentos com manutenção atrasada. 
              <Link href="/dashboard/manutencoes" className="font-semibold underline ml-1">
                Ver detalhes
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}