'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Manutencao {
  id: number;
  equipamento: number;
  equipamento_nome: string;
  tipo: string;
  data: string;
  horimetro: string;
  tecnico: number | null;
  tecnico_nome: string | null;
  descricao: string;
  observacoes: string;
  ordem_servico: number | null;
  ordem_servico_numero: string | null;
}

export default function RelatorioManutencoesPage() {
  const [loading, setLoading] = useState(true);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    tipo: '',
    equipamento: '',
    tecnico: '',
  });
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    preventivas: 0,
    corretivas: 0,
    percentual_preventivas: 0,
  });

  useEffect(() => {
    loadSelects();
    loadManutencoes();
  }, []);

  async function loadSelects() {
    try {
      const tecnicosRes = await fetch('/api/proxy/tecnicos/', { credentials: 'include' });

      if (tecnicosRes.ok) {
        const data = await tecnicosRes.json();
        setTecnicos(data.results || []);
      }

      // Carregar todos os equipamentos inicialmente
      await loadAllEquipamentos();
    } catch (error) {
      console.error('Erro ao carregar selects:', error);
    }
  }

  async function loadAllEquipamentos() {
    try {
      const response = await fetch('/api/proxy/equipamentos/equipamentos/', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setEquipamentos(data.results || []);
      }
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  }

  async function loadManutencoes() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.equipamento) params.append('equipamento', filtros.equipamento);
      if (filtros.tecnico) params.append('tecnico', filtros.tecnico);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/proxy/manutencoes/${query}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar manutenções');
      }

      const data = await response.json();
      const manutencoesData = data.results || [];
      setManutencoes(manutencoesData);

      // Calcular estatísticas
      const total = manutencoesData.length;
      const preventivas = manutencoesData.filter((m: Manutencao) => m.tipo === 'preventiva').length;
      const corretivas = manutencoesData.filter((m: Manutencao) => m.tipo === 'corretiva' || m.tipo === 'CORRETIVA').length;
      const percentual_preventivas = total > 0 ? Math.round((preventivas / total) * 100) : 0;

      setEstatisticas({
        total,
        preventivas,
        corretivas,
        percentual_preventivas,
      });
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFiltrar() {
    loadManutencoes();
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-900">Carregando relatório...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Manutenções</h1>
        <p className="text-gray-900 mt-1">
          Histórico e análise de manutenções realizadas
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filtros.data_fim}
              onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Tipo
            </label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="">Todos</option>
              <option value="preventiva">Preventiva</option>
              <option value="corretiva">Corretiva</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Equipamento
            </label>
            <select
              value={filtros.equipamento}
              onChange={(e) => setFiltros({ ...filtros, equipamento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="">Todos</option>
              {equipamentos.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.codigo} - {eq.descricao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Técnico
            </label>
            <select
              value={filtros.tecnico}
              onChange={(e) => setFiltros({ ...filtros, tecnico: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="">Todos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleFiltrar}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
          <button
            onClick={() => {
              setFiltros({
                data_inicio: '',
                data_fim: '',
                tipo: '',
                equipamento: '',
                tecnico: '',
              });
              // Recarregar após limpar
              setTimeout(() => loadManutencoes(), 100);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Total</div>
          <div className="text-2xl font-bold text-gray-900">{estatisticas.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Preventivas</div>
          <div className="text-2xl font-bold text-blue-600">{estatisticas.preventivas}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Corretivas</div>
          <div className="text-2xl font-bold text-orange-600">{estatisticas.corretivas}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">% Preventivas</div>
          <div className="text-2xl font-bold text-green-600">{estatisticas.percentual_preventivas}%</div>
        </div>
      </div>

      {/* Tabela de Manutenções */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Manutenções Realizadas</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Data</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Equipamento</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Tipo</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Horímetro/KM</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Técnico</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Descrição</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">OS</th>
              </tr>
            </thead>
            <tbody>
              {manutencoes.map((man) => (
                <tr key={man.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 text-sm text-gray-900">
                    {new Date(man.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 text-sm text-gray-900">{man.equipamento_nome}</td>
                  <td className="py-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      man.tipo === 'preventiva' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {man.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva'}
                    </span>
                  </td>
                  <td className="py-2 text-sm text-gray-900">{parseFloat(man.horimetro).toLocaleString('pt-BR')}</td>
                  <td className="py-2 text-sm text-gray-900">{man.tecnico_nome || '-'}</td>
                  <td className="py-2 text-sm text-gray-900">{man.descricao}</td>
                  <td className="py-2 text-sm text-gray-900">
                    {man.ordem_servico_numero || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {manutencoes.length === 0 && (
            <div className="text-center py-8 text-gray-900">
              Nenhuma manutenção encontrada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
