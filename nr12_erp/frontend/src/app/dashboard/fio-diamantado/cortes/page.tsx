'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fioDiamantadoApi, RegistroCorte, FioDiamantado } from '@/lib/api';

export default function ListaCortesPage() {
  const [cortes, setCortes] = useState<RegistroCorte[]>([]);
  const [fios, setFios] = useState<FioDiamantado[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<{
    totais: {
      total_cortes: number;
      area_total_m2: number;
      tempo_total_horas: number;
      velocidade_media_m2h: number;
      desgaste_total_mm: number;
      consumo_combustivel_litros: number;
      custo_combustivel: number;
    };
  } | null>(null);

  // Filtros
  const [filtroFio, setFiltroFio] = useState('');
  const [filtroFonte, setFiltroFonte] = useState('');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadFios();
  }, []);

  useEffect(() => {
    loadCortes();
  }, [filtroFio, filtroFonte, dataInicio, dataFim]);

  async function loadFios() {
    try {
      const res = await fioDiamantadoApi.fios.list();
      setFios(res.results || []);
    } catch (error) {
      console.error('Erro ao carregar fios:', error);
    }
  }

  async function loadCortes() {
    try {
      setLoading(true);
      const [cortesRes, metricasRes] = await Promise.all([
        fioDiamantadoApi.cortes.list({
          fio: filtroFio ? parseInt(filtroFio) : undefined,
          fonte_energia: filtroFonte || undefined,
          data_inicio: dataInicio,
          data_fim: dataFim,
        }),
        fioDiamantadoApi.cortes.metricas({
          data_inicio: dataInicio,
          data_fim: dataFim,
        }),
      ]);
      setCortes(cortesRes.results || []);
      setMetricas(metricasRes);
    } catch (error) {
      console.error('Erro ao carregar cortes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    let csv = 'Data;Fio;Maquina;Fonte;Area (m2);Tempo (h);Velocidade;Desgaste (mm);Operador\n';
    cortes.forEach((c) => {
      csv += `${new Date(c.data).toLocaleDateString('pt-BR')};${c.fio_codigo};${c.maquina_codigo};`;
      csv += `${c.fonte_energia === 'GERADOR_DIESEL' ? 'Diesel' : 'Rede'};`;
      csv += `${c.area_corte_m2};${c.tempo_execucao_horas};${c.velocidade_corte_m2h};`;
      csv += `${c.desgaste_mm};${c.operador_nome || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cortes-fio-diamantado-${dataInicio}-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/fio-diamantado" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
            &larr; Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Registros de Corte</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historico completo de cortes de fio diamantado
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={loading || cortes.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            Exportar CSV
          </button>
          <Link
            href="/dashboard/fio-diamantado/cortes/novo"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Novo Corte
          </Link>
        </div>
      </div>

      {/* Cards Resumo */}
      {metricas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Total de Cortes</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metricas.totais.total_cortes}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Area Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {metricas.totais.area_total_m2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m2
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Tempo Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {metricas.totais.tempo_total_horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Custo Combustivel</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              R$ {metricas.totais.custo_combustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Data Inicio</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Fio</label>
            <select
              value={filtroFio}
              onChange={(e) => setFiltroFio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {fios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codigo} - {f.fabricante}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Fonte de Energia</label>
            <select
              value={filtroFonte}
              onChange={(e) => setFiltroFonte(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="GERADOR_DIESEL">Gerador Diesel</option>
              <option value="REDE_ELETRICA">Rede Eletrica</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maquina</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonte</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Area (m2)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tempo (h)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Velocidade</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desgaste (mm)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cortes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Nenhum corte encontrado
                    </td>
                  </tr>
                ) : (
                  cortes.map((corte) => (
                    <tr key={corte.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(corte.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/fio-diamantado/${corte.fio}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {corte.fio_codigo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{corte.maquina_codigo}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {corte.fonte_energia === 'GERADOR_DIESEL' ? '⛽ Diesel' : '⚡ Rede'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {corte.area_corte_m2?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {corte.tempo_execucao_horas?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {corte.velocidade_corte_m2h?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m2/h
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {corte.desgaste_mm?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{corte.operador_nome || '-'}</td>
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
