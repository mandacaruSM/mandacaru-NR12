'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fioDiamantadoApi, FioDiamantado, DashboardFioDiamantado } from '@/lib/api';

export default function FioDiamantadoPage() {
  const [fios, setFios] = useState<FioDiamantado[]>([]);
  const [dashboard, setDashboard] = useState<DashboardFioDiamantado | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, [filtroStatus, search]);

  async function loadData() {
    try {
      setLoading(true);
      const [fiosRes, dashboardRes] = await Promise.all([
        fioDiamantadoApi.fios.list({
          status: filtroStatus || undefined,
          search: search || undefined,
        }),
        fioDiamantadoApi.dashboard(),
      ]);
      setFios(fiosRes.results || []);
      setDashboard(dashboardRes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'ATIVO':
        return 'bg-green-100 text-green-800';
      case 'FINALIZADO':
        return 'bg-gray-100 text-gray-800';
      case 'MANUTENCAO':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getVidaUtilColor(percentual: number) {
    if (percentual <= 20) return 'bg-red-500';
    if (percentual <= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fio Diamantado</h1>
          <p className="text-sm text-gray-900 mt-1">
            Controle de fios diamantados e registros de corte
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/fio-diamantado/cortes/novo"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Registrar Corte
          </Link>
          <Link
            href="/dashboard/fio-diamantado/novo"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Novo Fio
          </Link>
        </div>
      </div>

      {/* Cards Resumo */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Fios Ativos</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{dashboard.totais.fios_ativos}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Fios Criticos</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{dashboard.totais.fios_criticos}</p>
            <p className="text-xs text-gray-400 mt-1">precisam substituicao</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Fios Urgentes</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{dashboard.totais.fios_urgentes}</p>
            <p className="text-xs text-gray-400 mt-1">menos de 20% vida util</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Area Total Cortada</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {dashboard.totais.area_total_cortada_m2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m2
            </p>
          </div>
        </div>
      )}

      {/* Alertas */}
      {dashboard && dashboard.alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 mb-3">Alertas</h3>
          <div className="space-y-2">
            {dashboard.alertas.map((alerta, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  alerta.tipo === 'CRITICO' ? 'bg-red-100' : 'bg-yellow-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${alerta.tipo === 'CRITICO' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {alerta.tipo === 'CRITICO' ? '🚨' : '⚠️'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{alerta.fio_codigo}</p>
                    <p className="text-sm text-gray-600">{alerta.mensagem}</p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/fio-diamantado/${alerta.fio_id}`}
                  className="px-3 py-1 bg-white text-gray-900 rounded text-sm hover:bg-gray-50"
                >
                  Ver
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metricas 30 dias */}
      {dashboard && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Metricas dos ultimos 30 dias</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total de Cortes</p>
              <p className="text-xl font-bold text-gray-900">{dashboard.metricas_30_dias.total_cortes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Area Cortada</p>
              <p className="text-xl font-bold text-gray-900">
                {dashboard.metricas_30_dias.area_total_m2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m2
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tempo Total</p>
              <p className="text-xl font-bold text-gray-900">
                {dashboard.metricas_30_dias.tempo_total_horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Consumo Diesel</p>
              <p className="text-xl font-bold text-gray-900">
                {dashboard.metricas_30_dias.consumo_combustivel_litros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Custo Combustivel</p>
              <p className="text-xl font-bold text-green-600">
                R$ {dashboard.metricas_30_dias.custo_combustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Buscar</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Codigo, fabricante, serie..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="MANUTENCAO">Em Manutencao</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Fios */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fios.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Nenhum fio diamantado encontrado</p>
              <Link
                href="/dashboard/fio-diamantado/novo"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Cadastrar primeiro fio
              </Link>
            </div>
          ) : (
            fios.map((fio) => (
              <Link
                key={fio.id}
                href={`/dashboard/fio-diamantado/${fio.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{fio.codigo}</h3>
                    <p className="text-sm text-gray-500">{fio.fabricante}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(fio.status)}`}>
                    {fio.status_display || fio.status}
                  </span>
                </div>

                {/* Barra de vida util */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Vida Util</span>
                    <span className="font-medium text-gray-900">{fio.percentual_vida_util}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getVidaUtilColor(fio.percentual_vida_util || 0)}`}
                      style={{ width: `${fio.percentual_vida_util || 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Diametro Atual</p>
                    <p className="font-medium text-gray-900">{fio.diametro_atual_mm} mm</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Diametro Min.</p>
                    <p className="font-medium text-gray-900">{fio.diametro_minimo_mm} mm</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Comprimento</p>
                    <p className="font-medium text-gray-900">{fio.comprimento_metros} m</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Area Cortada</p>
                    <p className="font-medium text-gray-900">
                      {(fio.area_total_cortada_m2 || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m2
                    </p>
                  </div>
                </div>

                {fio.precisa_substituicao && (
                  <div className="mt-3 p-2 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-700 font-medium text-center">
                      Necessita Substituicao
                    </p>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      )}

      {/* Cortes Recentes */}
      {dashboard && dashboard.cortes_recentes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Cortes Recentes</h3>
            <Link
              href="/dashboard/fio-diamantado/cortes"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonte</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desgaste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboard.cortes_recentes.slice(0, 5).map((corte) => (
                  <tr key={corte.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(corte.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{corte.fio_codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {corte.fonte_energia === 'GERADOR_DIESEL' ? '⛽ Diesel' : '⚡ Rede'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {corte.area_corte_m2?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m2
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {corte.desgaste_mm?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
