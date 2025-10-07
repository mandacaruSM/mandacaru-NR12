'use client';

import { useState, useEffect } from 'react';
import { checklistsNR12Api, equipamentosApi, ChecklistRealizado, Equipamento } from '@/lib/api';

interface Estatisticas {
  total: number;
  porStatus: Record<string, number>;
  porEquipamento: Record<string, { total: number; conformidade: number }>;
  mediaConformidade: number;
  totalNaoConformidades: number;
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState<ChecklistRealizado[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [stats, setStats] = useState<Estatisticas | null>(null);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [equipamentoFiltro, setEquipamentoFiltro] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (checklists.length > 0) {
      calcularEstatisticas();
    }
  }, [checklists, dataInicio, dataFim, equipamentoFiltro]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [checklistsData, equipamentosData] = await Promise.all([
        checklistsNR12Api.list(),
        equipamentosApi.list({ ativo: true }),
      ]);
      setChecklists(checklistsData);
      setEquipamentos(equipamentosData);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = () => {
    let checklistsFiltrados = [...checklists];

    // Aplica filtros
    if (dataInicio) {
      checklistsFiltrados = checklistsFiltrados.filter(
        c => new Date(c.data_inspecao) >= new Date(dataInicio)
      );
    }
    if (dataFim) {
      checklistsFiltrados = checklistsFiltrados.filter(
        c => new Date(c.data_inspecao) <= new Date(dataFim)
      );
    }
    if (equipamentoFiltro) {
      checklistsFiltrados = checklistsFiltrados.filter(
        c => c.equipamento === Number(equipamentoFiltro)
      );
    }

    // Estatísticas por status
    const porStatus: Record<string, number> = {};
    checklistsFiltrados.forEach(c => {
      porStatus[c.status] = (porStatus[c.status] || 0) + 1;
    });

    // Estatísticas por equipamento
    const porEquipamento: Record<string, { total: number; conformidade: number }> = {};
    let totalConformidades = 0;
    let totalItens = 0;
    let totalNaoConformidades = 0;

    checklistsFiltrados.forEach(checklist => {
      const eqId = checklist.equipamento.toString();
      
      if (!porEquipamento[eqId]) {
        porEquipamento[eqId] = { total: 0, conformidade: 0 };
      }

      porEquipamento[eqId].total++;

      // Calcula conformidade
      const conformes = checklist.respostas.filter(r => r.resposta === 'conforme').length;
      const naoConformes = checklist.respostas.filter(r => r.resposta === 'nao_conforme').length;
      const naoAplicaveis = checklist.respostas.filter(r => r.resposta === 'nao_aplicavel').length;
      const total = checklist.respostas.length;

      totalNaoConformidades += naoConformes;

      if (total > 0) {
        const itensAplicaveis = total - naoAplicaveis;
        if (itensAplicaveis > 0) {
          const conformidade = (conformes / itensAplicaveis) * 100;
          porEquipamento[eqId].conformidade += conformidade;
          totalConformidades += conformidade;
          totalItens++;
        }
      }
    });

    // Média de conformidade
    const mediaConformidade = totalItens > 0 ? totalConformidades / totalItens : 0;

    // Ajusta conformidade média por equipamento
    Object.keys(porEquipamento).forEach(eqId => {
      const eq = porEquipamento[eqId];
      if (eq.total > 0) {
        eq.conformidade = eq.conformidade / eq.total;
      }
    });

    setStats({
      total: checklistsFiltrados.length,
      porStatus,
      porEquipamento,
      mediaConformidade,
      totalNaoConformidades,
    });
  };

  const getEquipamentoNome = (id: number) => {
    const eq = equipamentos.find(e => e.id === id);
    return eq ? `${eq.tag} - ${eq.descricao}` : `Equipamento ${id}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios NR12</h1>
        <p className="text-gray-600 mt-1">Análise e estatísticas das inspeções</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipamento</label>
            <select
              value={equipamentoFiltro}
              onChange={(e) => setEquipamentoFiltro(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {equipamentos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.tag} - {eq.descricao}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setDataInicio('');
            setDataFim('');
            setEquipamentoFiltro('');
          }}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700"
        >
          Limpar Filtros
        </button>
      </div>

      {stats && (
        <>
          {/* Cards de Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total de Checklists</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600">{Math.round(stats.mediaConformidade)}%</div>
              <div className="text-sm text-gray-600">Média de Conformidade</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-red-600">{stats.totalNaoConformidades}</div>
              <div className="text-sm text-gray-600">Total de Não Conformidades</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-purple-600">{stats.porStatus.concluido || 0}</div>
              <div className="text-sm text-gray-600">Checklists Concluídos</div>
            </div>
          </div>

          {/* Distribuição por Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Distribuição por Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.porStatus).map(([status, count]) => {
                const labels: Record<string, { name: string; color: string }> = {
                  em_andamento: { name: 'Em Andamento', color: 'blue' },
                  concluido: { name: 'Concluído', color: 'green' },
                  aprovado: { name: 'Aprovado', color: 'emerald' },
                  reprovado: { name: 'Reprovado', color: 'red' },
                };
                const info = labels[status] || { name: status, color: 'gray' };
                
                return (
                  <div key={status} className="text-center">
                    <div className={`text-2xl font-bold text-${info.color}-600`}>{count}</div>
                    <div className="text-sm text-gray-600">{info.name}</div>
                    <div className="text-xs text-gray-500">
                      {((count / stats.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conformidade por Equipamento */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Conformidade por Equipamento</h2>
            <div className="space-y-4">
              {Object.entries(stats.porEquipamento)
                .sort((a, b) => b[1].conformidade - a[1].conformidade)
                .map(([eqId, data]) => {
                  const percentual = Math.round(data.conformidade);
                  const cor = percentual >= 80 ? 'bg-green-500' : percentual >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                  
                  return (
                    <div key={eqId} className="border-b border-gray-200 pb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">
                          {getEquipamentoNome(Number(eqId))}
                        </span>
                        <span className="text-sm text-gray-600">
                          {data.total} checklist(s) - {percentual}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${cor} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Ações */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              🖨️ Imprimir Relatório
            </button>
            <button
              onClick={() => {
                const csv = `data:text/csv;charset=utf-8,${encodeURIComponent(
                  'Equipamento,Total Checklists,Conformidade\n' +
                  Object.entries(stats.porEquipamento)
                    .map(([id, data]) => 
                      `${getEquipamentoNome(Number(id))},${data.total},${Math.round(data.conformidade)}%`
                    )
                    .join('\n')
                )}`;
                const link = document.createElement('a');
                link.href = csv;
                link.download = `relatorio-nr12-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              📊 Exportar CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}