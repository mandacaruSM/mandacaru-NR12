'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ClientPlanCard from '@/components/ClientPlanCard';
import QRCodeScanner from '@/components/QRCodeScanner';
import {
  clientesApi,
  equipamentosApi,
  operadoresApi,
  supervisoresApi,
  ordensServicoApi,
  abastecimentosApi,
  nr12Api,
  manutencoesApi,
  Cliente,
  Equipamento,
  Abastecimento,
  ChecklistRealizado
} from '@/lib/api';

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
  date?: Date;
}

export default function DashboardPage() {
  const { user, hasModule } = useAuth();
  const isCliente = user?.profile?.role === 'CLIENTE';
  const [statsData, setStatsData] = useState({
    clientes: 0,
    equipamentos: 0,
    operadores: 0,
    supervisores: 0,
    osAbertas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadRecentActivities();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const promises: Promise<any>[] = [
        clientesApi.list({ page_size: 1 }),
        equipamentosApi.list({ page_size: 1 }),
      ];
      if (!isCliente) {
        promises.push(
          operadoresApi.list({ page_size: 1 }),
          supervisoresApi.list({ page_size: 1 }),
        );
      }
      promises.push(ordensServicoApi.list({ status: 'ABERTA', page_size: 1 }));

      const results = await Promise.all(promises);

      if (isCliente) {
        setStatsData({
          clientes: results[0].count || 0,
          equipamentos: results[1].count || 0,
          operadores: 0,
          supervisores: 0,
          osAbertas: results[2].count || 0,
        });
      } else {
        setStatsData({
          clientes: results[0].count || 0,
          equipamentos: results[1].count || 0,
          operadores: results[2].count || 0,
          supervisores: results[3].count || 0,
          osAbertas: results[4].count || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atras`;
    if (diffHours < 24) return `${diffHours}h atras`;
    if (diffDays < 7) return `${diffDays} dias atras`;
    return date.toLocaleDateString('pt-BR');
  }

  async function loadRecentActivities() {
    try {
      setActivitiesLoading(true);
      const activities: Activity[] = [];

      // Buscar dados em paralelo
      const [clientesRes, equipamentosRes, abastecimentosRes, checklistsRes] = await Promise.all([
        clientesApi.list({ page_size: 3, ordering: '-criado_em' }).catch(() => ({ results: [] })),
        equipamentosApi.list({ page_size: 3, ordering: '-criado_em' }).catch(() => ({ results: [] })),
        abastecimentosApi.list({ page: 1 }).catch(() => ({ results: [] })),
        nr12Api.checklists.list().catch(() => ({ results: [] })),
      ]);

      // Adicionar clientes recentes
      (clientesRes.results || []).slice(0, 2).forEach((cliente: Cliente, idx: number) => {
        activities.push({
          id: 1000 + idx,
          action: 'Cliente cadastrado',
          detail: cliente.nome_razao,
          time: formatTimeAgo(cliente.criado_em),
          icon: '👥',
          color: 'bg-blue-100 text-blue-600',
          date: new Date(cliente.criado_em),
        });
      });

      // Adicionar equipamentos recentes
      (equipamentosRes.results || []).slice(0, 2).forEach((eq: Equipamento, idx: number) => {
        activities.push({
          id: 2000 + idx,
          action: 'Equipamento cadastrado',
          detail: `${eq.codigo} - ${eq.descricao || eq.modelo || ''}`,
          time: formatTimeAgo(eq.criado_em),
          icon: '🚜',
          color: 'bg-green-100 text-green-600',
          date: new Date(eq.criado_em),
        });
      });

      // Adicionar abastecimentos recentes
      (abastecimentosRes.results || []).slice(0, 2).forEach((ab: Abastecimento, idx: number) => {
        activities.push({
          id: 3000 + idx,
          action: 'Abastecimento registrado',
          detail: `${ab.equipamento_codigo} - ${ab.quantidade_litros}L`,
          time: formatTimeAgo(ab.created_at),
          icon: '⛽',
          color: 'bg-orange-100 text-orange-600',
          date: new Date(ab.created_at),
        });
      });

      // Adicionar checklists recentes
      (checklistsRes.results || []).slice(0, 2).forEach((cl: ChecklistRealizado, idx: number) => {
        const statusIcon = cl.resultado_geral === 'APROVADO' ? '✅' :
                          cl.resultado_geral === 'REPROVADO' ? '❌' : '📋';
        const statusColor = cl.resultado_geral === 'APROVADO' ? 'bg-green-100 text-green-600' :
                           cl.resultado_geral === 'REPROVADO' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600';
        activities.push({
          id: 4000 + idx,
          action: cl.status === 'CONCLUIDO' ? 'Checklist concluido' : 'Checklist iniciado',
          detail: `${cl.equipamento_codigo} - ${cl.modelo_nome}`,
          time: formatTimeAgo(cl.criado_em),
          icon: statusIcon,
          color: statusColor,
          date: new Date(cl.criado_em),
        });
      });

      // Ordenar por data (mais recente primeiro) e limitar a 6 itens
      activities.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
      setRecentActivities(activities.slice(0, 6));
    } catch (error) {
      console.error('Erro ao carregar atividades recentes:', error);
      setRecentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }

  const allStats: (StatCard & { adminOnly?: boolean })[] = [
    {
      title: isCliente ? 'Minha Empresa' : 'Total de Clientes',
      value: loading ? '...' : statsData.clientes.toString(),
      change: '',
      href: '/dashboard/clientes',
      icon: '👥',
      changeType: 'neutral',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Equipamentos',
      value: loading ? '...' : statsData.equipamentos.toString(),
      change: '',
      href: '/dashboard/equipamentos',
      icon: '🚜',
      changeType: 'neutral',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Operadores',
      value: loading ? '...' : statsData.operadores.toString(),
      change: '',
      href: '/dashboard/operadores',
      icon: '👷',
      changeType: 'neutral',
      color: 'from-indigo-500 to-indigo-600',
      adminOnly: true,
    },
    {
      title: 'Supervisores',
      value: loading ? '...' : statsData.supervisores.toString(),
      change: '',
      href: '/dashboard/supervisores',
      icon: '👨‍💼',
      changeType: 'neutral',
      color: 'from-purple-500 to-purple-600',
      adminOnly: true,
    },
    {
      title: 'OS Abertas',
      value: loading ? '...' : statsData.osAbertas.toString(),
      change: '',
      href: '/dashboard/ordens-servico',
      icon: '📝',
      changeType: 'neutral',
      color: 'from-red-500 to-red-600',
    },
  ];

  const stats = allStats.filter(s => !s.adminOnly || !isCliente);


  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-black">
              Olá, {user?.username}!
            </h1>
            <p className="text-lg text-black">
              Bem-vindo ao sistema de gestão NR12
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-black">Hoje</p>
              <p className="text-xl font-semibold text-black">
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
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
              {stat.change && (
                <div className="flex items-center">
                  <span
                    className={`text-xs font-medium ${
                      stat.changeType === 'positive'
                        ? 'text-green-600 bg-green-50'
                        : stat.changeType === 'negative'
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-900 bg-gray-50'
                    } px-2 py-1 rounded-full`}
                  >
                    {stat.change}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Plan Card for Clients */}
      {user?.profile?.role === 'CLIENTE' && (
        <ClientPlanCard />
      )}

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
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma atividade recente</p>
              </div>
            ) : (
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
                      <p className="text-sm text-gray-900 truncate">{activity.detail}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {!isCliente && (
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
              )}
              {!isCliente && (
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
              )}
              {!isCliente && (
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
              )}
              {!isCliente && (
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
              )}
              {!isCliente && (
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
              )}
              {!isCliente && (
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
              )}
              {isCliente && (
                <>
                  <Link
                    href="/dashboard/equipamentos"
                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                      <span className="text-2xl">🚜</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-center">
                      Meus Equipamentos
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/ordens-servico"
                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                      <span className="text-2xl">📝</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-red-700 text-center">
                      Minhas OS
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/orcamentos"
                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-yellow-500 hover:bg-yellow-50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-yellow-100 group-hover:bg-yellow-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                      <span className="text-2xl">💰</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-yellow-700 text-center">
                      Meus Orçamentos
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/empreendimentos"
                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                      <span className="text-2xl">🏗️</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-center">
                      Meus Empreendimentos
                    </span>
                  </Link>
                </>
              )}
              <button
                onClick={() => setScannerOpen(true)}
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-teal-100 group-hover:bg-teal-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700 text-center">
                  Escanear QR Code
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}