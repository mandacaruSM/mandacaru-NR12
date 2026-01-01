'use client';

import { useState, useEffect } from 'react';

interface Abastecimento {
  id: number;
  equipamento: number;
  equipamento_nome: string;
  data: string;
  horimetro: string;
  litros: string;
  valor_unitario: string;
  valor_total: string;
  posto: string;
  observacoes: string;
}

export default function RelatorioAbastecimentosPage() {
  const [loading, setLoading] = useState(true);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    equipamento: '',
  });
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [estatisticas, setEstatisticas] = useState({
    total_litros: 0,
    total_valor: 0,
    media_preco: 0,
    total_abastecimentos: 0,
  });

  useEffect(() => {
    loadSelects();
    loadAbastecimentos();
  }, []);

  async function loadSelects() {
    try {
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

  async function loadAbastecimentos() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.equipamento) params.append('equipamento', filtros.equipamento);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/proxy/abastecimentos/${query}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar abastecimentos');
      }

      const data = await response.json();
      const abastecimentosData = data.results || [];
      setAbastecimentos(abastecimentosData);

      // Calcular estatísticas
      const total_litros = abastecimentosData.reduce((sum: number, a: Abastecimento) => sum + parseFloat(a.litros), 0);
      const total_valor = abastecimentosData.reduce((sum: number, a: Abastecimento) => sum + parseFloat(a.valor_total), 0);
      const media_preco = total_litros > 0 ? total_valor / total_litros : 0;

      setEstatisticas({
        total_litros,
        total_valor,
        media_preco,
        total_abastecimentos: abastecimentosData.length,
      });
    } catch (error) {
      console.error('Erro ao carregar abastecimentos:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFiltrar() {
    loadAbastecimentos();
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
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Abastecimentos</h1>
        <p className="text-gray-900 mt-1">
          Consumo de combustível por equipamento
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="flex items-end gap-2">
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
                  equipamento: '',
                });
                // Recarregar após limpar
                setTimeout(() => loadAbastecimentos(), 100);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Total de Abastecimentos</div>
          <div className="text-2xl font-bold text-gray-900">{estatisticas.total_abastecimentos}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Total de Litros</div>
          <div className="text-2xl font-bold text-blue-600">{estatisticas.total_litros.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Valor Total</div>
          <div className="text-2xl font-bold text-green-600">
            {estatisticas.total_valor.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Preço Médio/Litro</div>
          <div className="text-2xl font-bold text-orange-600">
            {estatisticas.media_preco.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </div>
        </div>
      </div>

      {/* Tabela de Abastecimentos */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Abastecimentos Realizados</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Data</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Equipamento</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Horímetro/KM</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Litros</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Valor/Litro</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Valor Total</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Posto</th>
              </tr>
            </thead>
            <tbody>
              {abastecimentos.map((abast) => (
                <tr key={abast.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 text-sm text-gray-900">
                    {new Date(abast.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 text-sm text-gray-900">{abast.equipamento_nome}</td>
                  <td className="py-2 text-sm text-gray-900">{parseFloat(abast.horimetro).toLocaleString('pt-BR')}</td>
                  <td className="py-2 text-sm text-gray-900">{parseFloat(abast.litros).toFixed(2)} L</td>
                  <td className="py-2 text-sm text-gray-900">
                    {parseFloat(abast.valor_unitario).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="py-2 text-sm font-semibold text-gray-900">
                    {parseFloat(abast.valor_total).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="py-2 text-sm text-gray-900">{abast.posto || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {abastecimentos.length === 0 && (
            <div className="text-center py-8 text-gray-900">
              Nenhum abastecimento encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
