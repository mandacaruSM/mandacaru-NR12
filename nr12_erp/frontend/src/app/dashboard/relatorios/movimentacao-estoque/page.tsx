'use client';

import { useState, useEffect } from 'react';
import { almoxarifadoApi, MovimentoEstoque, LocalEstoque } from '@/lib/api';

export default function RelatorioMovimentacaoEstoquePage() {
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]);
  const [locais, setLocais] = useState<LocalEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);

  // Resumo
  const [resumo, setResumo] = useState({
    entradas: 0,
    saidas: 0,
    ajustes: 0,
    totalMovimentos: 0,
  });

  useEffect(() => {
    loadLocais();
  }, []);

  useEffect(() => {
    loadMovimentos();
  }, [filtroTipo, filtroLocal, dataInicio, dataFim]);

  async function loadLocais() {
    try {
      const res = await almoxarifadoApi.locais.list();
      setLocais(res.results || []);
    } catch (error) {
      console.error('Erro ao carregar locais:', error);
    }
  }

  async function loadMovimentos() {
    try {
      setLoading(true);
      const res = await almoxarifadoApi.movimentos.list({
        tipo: filtroTipo || undefined,
        local: filtroLocal ? Number(filtroLocal) : undefined,
        data_inicio: dataInicio,
        data_fim: dataFim,
      });
      const movs = res.results || [];
      setMovimentos(movs);

      // Calcular resumo
      const entradas = movs.filter((m) => m.tipo === 'ENTRADA').reduce((acc, m) => acc + Number(m.quantidade), 0);
      const saidas = movs.filter((m) => m.tipo === 'SAIDA').reduce((acc, m) => acc + Number(m.quantidade), 0);
      const ajustes = movs.filter((m) => m.tipo === 'AJUSTE').length;
      setResumo({
        entradas,
        saidas,
        ajustes,
        totalMovimentos: movs.length,
      });
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTipoColor(tipo: string) {
    switch (tipo) {
      case 'ENTRADA':
        return 'bg-green-100 text-green-800';
      case 'SAIDA':
        return 'bg-red-100 text-red-800';
      case 'AJUSTE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  async function handleExportCSV() {
    let csv = 'Data;Produto;Codigo;Local;Tipo;Quantidade;Documento;Observacao\n';
    movimentos.forEach((m) => {
      csv += `${new Date(m.data_hora).toLocaleString('pt-BR')};${m.produto_nome};${m.produto_codigo};`;
      csv += `${m.local_nome};${m.tipo_display || m.tipo};${m.quantidade};${m.documento};${m.observacao || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimentacao-estoque-${dataInicio}-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimentacao de Estoque</h1>
          <p className="text-sm text-gray-500 mt-1">
            Entradas e saidas de produtos
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          Exportar CSV
        </button>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total Entradas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{resumo.entradas.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400 mt-1">unidades</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total Saidas</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{resumo.saidas.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400 mt-1">unidades</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Ajustes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{resumo.ajustes}</p>
          <p className="text-xs text-gray-400 mt-1">movimentos</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total Movimentos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{resumo.totalMovimentos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicio</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saida</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <select
              value={filtroLocal}
              onChange={(e) => setFiltroLocal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movimentos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhum movimento encontrado
                    </td>
                  </tr>
                ) : (
                  movimentos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(mov.data_hora).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{mov.produto_nome}</p>
                          <p className="text-xs text-gray-500">{mov.produto_codigo}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{mov.local_nome}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(mov.tipo)}`}>
                          {mov.tipo_display || mov.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {Number(mov.quantidade).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{mov.documento || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
