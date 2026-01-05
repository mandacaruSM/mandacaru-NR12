'use client';

import { useState, useEffect } from 'react';
import { financeiroApi, type ContaReceber, type ContaPagar } from '@/lib/api';

interface FluxoCaixaItem {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  numero: string;
  descricao: string;
  data: string;
  valor: number;
  status: string;
  status_display: string;
  origem?: string;
}

export default function FluxoCaixaPage() {
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    status: '',
  });
  const [items, setItems] = useState<FluxoCaixaItem[]>([]);
  const [totais, setTotais] = useState({
    entradas: 0,
    saidas: 0,
    saldo: 0,
  });

  useEffect(() => {
    loadFluxoCaixa();
  }, [filtros]);

  async function loadFluxoCaixa() {
    try {
      setLoading(true);

      // Buscar contas a receber e a pagar
      const [contasReceberRes, contasPagarRes] = await Promise.all([
        financeiroApi.contasReceber.list(filtros),
        financeiroApi.contasPagar.list(filtros),
      ]);

      const contasReceber = contasReceberRes.results || [];
      const contasPagar = contasPagarRes.results || [];

      // Transformar em items de fluxo de caixa
      const entradasItems: FluxoCaixaItem[] = contasReceber.map((conta: ContaReceber) => ({
        id: conta.id!,
        tipo: 'ENTRADA' as const,
        numero: conta.numero || '',
        descricao: `${conta.cliente_nome} - ${conta.tipo_display}`,
        data: conta.data_vencimento,
        valor: Number(conta.valor_final || 0),
        status: conta.status,
        status_display: conta.status_display || '',
        origem: conta.orcamento_numero || conta.ordem_servico_numero,
      }));

      const saidasItems: FluxoCaixaItem[] = contasPagar.map((conta: ContaPagar) => ({
        id: conta.id!,
        tipo: 'SAIDA' as const,
        numero: conta.numero || '',
        descricao: `${conta.fornecedor} - ${conta.tipo_display}`,
        data: conta.data_vencimento,
        valor: Number(conta.valor_final || 0),
        status: conta.status,
        status_display: conta.status_display || '',
        origem: conta.numero_documento,
      }));

      // Combinar e ordenar por data
      const todosItems = [...entradasItems, ...saidasItems].sort((a, b) =>
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );

      setItems(todosItems);

      // Calcular totais
      const totalEntradas = entradasItems
        .filter(i => i.status !== 'CANCELADA')
        .reduce((sum, i) => sum + i.valor, 0);

      const totalSaidas = saidasItems
        .filter(i => i.status !== 'CANCELADA')
        .reduce((sum, i) => sum + i.valor, 0);

      setTotais({
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: totalEntradas - totalSaidas,
      });

    } catch (error) {
      console.error('Erro ao carregar fluxo de caixa:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      ABERTA: 'bg-blue-100 text-blue-800',
      PAGA: 'bg-green-100 text-green-800',
      VENCIDA: 'bg-red-100 text-red-800',
      CANCELADA: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
        <p className="text-gray-900 mt-1">Visualização consolidada de entradas e saídas</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Total de Entradas</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            R$ {totais.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Total de Saídas</h3>
            <span className="text-2xl">💸</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            R$ {totais.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Saldo</h3>
            <span className="text-2xl">📊</span>
          </div>
          <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {Math.abs(totais.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-900 mt-1">
            {totais.saldo >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
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
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Status
            </label>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              className="w-full px-3 py-2 border rounded text-black bg-white"
            >
              <option value="" className="text-black bg-white">Todos</option>
              <option value="ABERTA" className="text-black bg-white">Aberta</option>
              <option value="PAGA" className="text-black bg-white">Paga</option>
              <option value="VENCIDA" className="text-black bg-white">Vencida</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Fluxo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhuma movimentação encontrada</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Origem
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase">
                  Entradas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase">
                  Saídas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={`${item.tipo}-${item.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.descricao}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.origem || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {item.tipo === 'ENTRADA' && (
                      <span className="text-green-600 font-medium">
                        + R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {item.tipo === 'SAIDA' && (
                      <span className="text-red-600 font-medium">
                        - R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(item.status)}`}>
                      {item.status_display}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right text-sm text-gray-900">
                  TOTAIS:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                  + R$ {totais.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                  - R$ {totais.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={totais.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                    Saldo: R$ {Math.abs(totais.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
