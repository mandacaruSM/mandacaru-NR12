// frontend/src/app/dashboard/nr12/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { nr12Api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function NR12DashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await nr12Api.checklists.estatisticas();
      setStats(data);
    } catch (err: any) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Checklists',
      value: stats?.total || 0,
      change: 'Últimos 30 dias',
      icon: '📋',
      color: 'blue',
      href: '/dashboard/nr12/checklists',
    },
    {
      title: 'Concluídos',
      value: stats?.concluidos || 0,
      change: `${stats?.em_andamento || 0} em andamento`,
      icon: '✅',
      color: 'green',
      href: '/dashboard/nr12/checklists?status=CONCLUIDO',
    },
    {
      title: 'Aprovados',
      value: stats?.aprovados || 0,
      change: `${stats?.reprovados || 0} reprovados`,
      icon: '🎯',
      color: 'emerald',
      href: '/dashboard/nr12/checklists?resultado=APROVADO',
    },
    {
      title: 'Com Restrição',
      value: stats?.aprovados_restricao || 0,
      change: 'Requer atenção',
      icon: '⚠️',
      color: 'yellow',
      href: '/dashboard/nr12/checklists?resultado=APROVADO_RESTRICAO',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NR12 - Checklists</h1>
            <p className="text-gray-600 mt-1">
              Sistema de gestão de checklists de segurança
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/nr12/modelos"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              🏷️ Modelos
            </Link>
            <Link
              href="/dashboard/nr12/checklists"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📋 Ver Checklists
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-2">{stat.change}</p>
              </div>
              <div className="text-5xl">{stat.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Equipamentos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top Equipamentos</h2>
            <p className="text-sm text-gray-600">Equipamentos mais inspecionados</p>
          </div>
          <div className="p-6">
            {stats?.por_equipamento && stats.por_equipamento.length > 0 ? (
              <ul className="space-y-3">
                {stats.por_equipamento.slice(0, 5).map((item: any, index: number) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.equipamento__codigo}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.equipamento__descricao}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        {/* Top Modelos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top Modelos</h2>
            <p className="text-sm text-gray-600">Modelos mais utilizados</p>
          </div>
          <div className="p-6">
            {stats?.por_modelo && stats.por_modelo.length > 0 ? (
              <ul className="space-y-3">
                {stats.por_modelo.slice(0, 5).map((item: any, index: number) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <p className="text-sm font-medium text-gray-900">
                        {item.modelo__nome}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/dashboard/nr12/modelos/novo"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <span className="text-4xl mb-2">➕</span>
              <span className="text-sm font-medium text-gray-700">Novo Modelo</span>
            </Link>

            <Link
              href="/dashboard/nr12/checklists?status=EM_ANDAMENTO"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="text-4xl mb-2">⏳</span>
              <span className="text-sm font-medium text-gray-700">Em Andamento</span>
            </Link>

            <Link
              href="/dashboard/nr12/checklists?resultado=REPROVADO"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
            >
              <span className="text-4xl mb-2">❌</span>
              <span className="text-sm font-medium text-gray-700">Reprovados</span>
            </Link>

            <Link
              href="/dashboard/nr12/relatorios"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <span className="text-4xl mb-2">📊</span>
              <span className="text-sm font-medium text-gray-700">Relatórios</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Info Bot */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-6 rounded-lg">
        <div className="flex items-start gap-4">
          <span className="text-4xl">🤖</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Integração com Bot Telegram
            </h3>
            <p className="text-gray-700 mb-3">
              Os operadores podem realizar checklists diretamente pelo Telegram, 
              facilitando o registro em campo e aumentando a adesão ao processo.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>✓</span>
                <span>Checklist interativo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>✓</span>
                <span>Envio de fotos</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>✓</span>
                <span>Notificações automáticas</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}