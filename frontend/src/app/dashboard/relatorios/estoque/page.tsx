'use client';

import { useState, useEffect } from 'react';
import { produtosApi, type Produto } from '@/lib/api';

export default function RelatorioEstoquePage() {
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filtros, setFiltros] = useState({
    search: '',
    tipo: '',
    local: '',
  });
  const [resumo, setResumo] = useState({
    total_produtos: 0,
    total_itens: 0,
    valor_total: 0,
    produtos_falta: 0,
  });

  useEffect(() => {
    loadRelatorio();
  }, [filtros]);

  async function loadRelatorio() {
    try {
      setLoading(true);
      const data = await produtosApi.list(filtros);
      setProdutos(data.results || []);

      // Calcular resumo
      const produtos_list = data.results || [];
      const total_produtos = produtos_list.length;
      const total_itens = produtos_list.reduce((sum, p) => sum + Number(p.quantidade_estoque || 0), 0);
      const valor_total = produtos_list.reduce((sum, p) => sum + (Number(p.quantidade_estoque || 0) * Number(p.preco_custo || 0)), 0);
      const produtos_falta = produtos_list.filter(p => Number(p.quantidade_estoque || 0) < Number(p.estoque_minimo || 0)).length;

      setResumo({
        total_produtos,
        total_itens,
        valor_total,
        produtos_falta,
      });
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleImprimir() {
    window.print();
  }

  function handleExportarCSV() {
    const headers = ['Código', 'Nome', 'Tipo', 'Unidade', 'Qtd. Estoque', 'Estoque Mín.', 'Preço Custo', 'Preço Venda', 'Valor Total', 'Local'];
    const rows = produtos.map(p => [
      p.codigo,
      p.nome,
      p.tipo_display || '',
      p.unidade_medida,
      p.quantidade_estoque || 0,
      p.estoque_minimo || 0,
      Number(p.preco_custo || 0).toFixed(2),
      Number(p.preco_venda || 0).toFixed(2),
      (Number(p.quantidade_estoque || 0) * Number(p.preco_custo || 0)).toFixed(2),
      p.local_estoque_nome || '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_estoque_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  return (
    <div className="p-6">
      {/* Cabeçalho com Logo - visível apenas na impressão */}
      <div className="hidden print:block mb-6">
        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
          <div>
            <img
              src="/logo.png"
              alt="Logo da Empresa"
              className="w-48 h-auto max-h-20 object-contain"
            />
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">Relatório de Estoque</h1>
            <p className="text-sm text-gray-600 mt-1">Posição atual de estoque</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Estoque</h1>
          <p className="text-sm text-gray-600 mt-1">Posição atual de estoque</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportarCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
          <button
            onClick={handleImprimir}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 no-print">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={filtros.search}
              onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
              placeholder="Código ou nome..."
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Tipo
            </label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            >
              <option value="">Todos</option>
              <option value="PRODUTO">Produto</option>
              <option value="MATERIA_PRIMA">Matéria Prima</option>
              <option value="CONSUMIVEL">Consumível</option>
              <option value="FERRAMENTA">Ferramenta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Local
            </label>
            <input
              type="text"
              value={filtros.local}
              onChange={(e) => setFiltros({ ...filtros, local: e.target.value })}
              placeholder="Local de estoque..."
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total de Produtos</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.total_produtos}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total de Itens</p>
          <p className="text-2xl font-bold text-blue-900">{resumo.total_itens.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Valor Total (Custo)</p>
          <p className="text-xl font-bold text-green-900">R$ {Number(resumo.valor_total).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Produtos em Falta</p>
          <p className="text-2xl font-bold text-red-900">{resumo.produtos_falta}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : produtos.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhum produto encontrado</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Unidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Qtd. Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Estoque Mín.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Preço Custo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Local
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {produtos.map((produto) => {
                const qtd = Number(produto.quantidade_estoque || 0);
                const minimo = Number(produto.estoque_minimo || 0);
                const emFalta = qtd < minimo;
                const valorTotal = qtd * Number(produto.preco_custo || 0);

                return (
                  <tr key={produto.id} className={emFalta ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {produto.codigo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {produto.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {produto.tipo_display}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {produto.unidade_medida}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${emFalta ? 'text-red-900' : 'text-gray-900'}`}>
                      {qtd.toFixed(2)}
                      {emFalta && ' ⚠️'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {minimo.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {Number(produto.preco_custo || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      R$ {valorTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {produto.local_estoque_nome || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 2cm;
            size: A4 landscape;
          }
        }
      `}</style>
    </div>
  );
}
