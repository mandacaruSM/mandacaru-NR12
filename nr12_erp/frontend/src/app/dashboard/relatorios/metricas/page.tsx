'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  metricasApi,
  empreendimentosApi,
  MetricaDashboard,
  AlertaManutencao,
  Empreendimento,
} from '@/lib/api';

export default function MetricasGestaoPage() {
  const { user } = useAuth();
  const isCliente = user?.profile?.role === 'CLIENTE';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MetricaDashboard | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);

  // Filtros
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [empreendimentoId, setEmpreendimentoId] = useState<number | undefined>(undefined);

  // Exportar
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadEmpreendimentos();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [dataInicio, dataFim, empreendimentoId]);

  async function loadEmpreendimentos() {
    try {
      const res = await empreendimentosApi.list({ page_size: 100 });
      setEmpreendimentos(res.results || []);
    } catch (err) {
      console.error('Erro ao carregar empreendimentos:', err);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const data = await metricasApi.dashboard({
        data_inicio: dataInicio,
        data_fim: dataFim,
        empreendimento: empreendimentoId,
      });
      setDashboard(data);
    } catch (err) {
      console.error('Erro ao carregar metricas:', err);
      setError('Erro ao carregar metricas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    try {
      setExporting(true);
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const data = await metricasApi.exportar({
        data_inicio: dataInicio,
        data_fim: dataFim,
        empreendimento: empreendimentoId,
      });

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Cabecalho
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138);
      doc.text('Relatorio de Metricas de Gestao', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Periodo: ${dataInicio} a ${dataFim}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 33, { align: 'center' });

      let yPos = 45;

      // Resumo
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumo Geral', 14, yPos);
      yPos += 8;

      const resumoData = [
        ['Total de Equipamentos', data.resumo?.total_equipamentos?.toString() || '0'],
        ['Disponibilidade Media (DF%)', `${data.resumo?.disponibilidade_media?.toFixed(1) || 0}%`],
        ['Consumo Medio', `${data.resumo?.consumo_medio_lh?.toFixed(2) || 0} L/h`],
        ['Utilizacao da Frota', `${data.resumo?.utilizacao_frota?.toFixed(1) || 0}%`],
        ['CPH Medio', `R$ ${data.resumo?.cph_medio?.toFixed(2) || 0}`],
        ['Total Combustivel', `${data.resumo?.total_combustivel_litros?.toLocaleString('pt-BR') || 0} L`],
        ['Valor Combustivel', `R$ ${data.resumo?.total_combustivel_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metrica', 'Valor']],
        body: resumoData,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Alertas
      if (data.alertas && data.alertas.length > 0) {
        doc.setFontSize(14);
        doc.text('Alertas de Manutencao', 14, yPos);
        yPos += 8;

        const alertasData = data.alertas.slice(0, 15).map((a: AlertaManutencao) => [
          a.codigo,
          a.item,
          a.prioridade,
          `${a.leitura_atual.toFixed(0)} ${a.unidade}`,
          `${a.proxima_leitura.toFixed(0)} ${a.unidade}`,
          `${a.diferenca.toFixed(0)} ${a.unidade}`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Equipamento', 'Item', 'Prioridade', 'Leitura Atual', 'Proxima', 'Diferenca']],
          body: alertasData,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 138] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        });
      }

      // Rodape
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Pagina ${i} de ${pageCount} | Sistema NR12 ERP`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`metricas-gestao-${dataInicio}-${dataFim}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportCSV() {
    try {
      setExporting(true);
      const data = await metricasApi.exportar({
        data_inicio: dataInicio,
        data_fim: dataFim,
        empreendimento: empreendimentoId,
      });

      // Gerar CSV
      let csv = 'Metrica;Valor\n';
      csv += `Total de Equipamentos;${data.resumo?.total_equipamentos || 0}\n`;
      csv += `Disponibilidade Media (%);${data.resumo?.disponibilidade_media?.toFixed(2) || 0}\n`;
      csv += `Consumo Medio (L/h);${data.resumo?.consumo_medio_lh?.toFixed(2) || 0}\n`;
      csv += `Utilizacao da Frota (%);${data.resumo?.utilizacao_frota?.toFixed(2) || 0}\n`;
      csv += `CPH Medio (R$);${data.resumo?.cph_medio?.toFixed(2) || 0}\n`;
      csv += `Total Combustivel (L);${data.resumo?.total_combustivel_litros || 0}\n`;
      csv += `Valor Combustivel (R$);${data.resumo?.total_combustivel_valor?.toFixed(2) || 0}\n`;
      csv += `Alertas Criticos;${data.resumo?.alertas_criticos || 0}\n`;
      csv += `Alertas Urgentes;${data.resumo?.alertas_urgentes || 0}\n`;

      if (data.alertas && data.alertas.length > 0) {
        csv += '\n\nAlertas de Manutencao\n';
        csv += 'Equipamento;Item;Prioridade;Leitura Atual;Proxima;Diferenca;Unidade\n';
        data.alertas.forEach((a: AlertaManutencao) => {
          csv += `${a.codigo};${a.item};${a.prioridade};${a.leitura_atual};${a.proxima_leitura};${a.diferenca};${a.unidade}\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `metricas-gestao-${dataInicio}-${dataFim}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      alert('Erro ao gerar CSV');
    } finally {
      setExporting(false);
    }
  }

  function getPrioridadeColor(prioridade: string) {
    switch (prioridade) {
      case 'CRITICO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'URGENTE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ATENCAO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getDisponibilidadeColor(percent: number) {
    if (percent >= 90) return 'text-green-600';
    if (percent >= 75) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metricas de Gestao</h1>
          <p className="text-sm text-gray-500 mt-1">
            Indicadores de performance para operacoes de mineracao
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicio</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empreendimento</label>
            <select
              value={empreendimentoId || ''}
              onChange={(e) => setEmpreendimentoId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os empreendimentos</option>
              {empreendimentos.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Aviso sem dados */}
      {!loading && dashboard?.aviso && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-700">
          {dashboard.aviso}
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && dashboard && dashboard.metricas && (
        <>
          {/* Cards de Metricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* DF% */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Disponibilidade (DF%)</span>
                <span className="text-xl">📊</span>
              </div>
              <p className={`text-3xl font-bold ${getDisponibilidadeColor(dashboard.metricas.disponibilidade_fisica.media_percent)}`}>
                {dashboard.metricas.disponibilidade_fisica.media_percent.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {dashboard.metricas.disponibilidade_fisica.equipamentos_analisados} equipamentos
              </p>
            </div>

            {/* Consumo Medio */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Consumo Medio</span>
                <span className="text-xl">⛽</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {dashboard.metricas.consumo_medio.media_litros_hora.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">L/h</p>
            </div>

            {/* Utilizacao */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Utilizacao Frota</span>
                <span className="text-xl">🚜</span>
              </div>
              <p className="text-3xl font-bold text-indigo-600">
                {dashboard.metricas.utilizacao_frota.percentual.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {dashboard.metricas.utilizacao_frota.operando}/{dashboard.metricas.utilizacao_frota.total} ativos
              </p>
            </div>

            {/* CPH */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">CPH Medio</span>
                <span className="text-xl">💰</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                R$ {dashboard.metricas.cph.cph_medio.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Custo por hora</p>
            </div>
          </div>

          {/* Totais do Periodo */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-80">Equipamentos</p>
              <p className="text-2xl font-bold">{dashboard.totais.equipamentos}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-80">Combustivel (L)</p>
              <p className="text-2xl font-bold">{dashboard.totais.combustivel_litros.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-80">Combustivel (R$)</p>
              <p className="text-2xl font-bold">
                {dashboard.totais.combustivel_valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-80">Custo Servicos</p>
              <p className="text-2xl font-bold">
                {dashboard.totais.custo_servicos.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-80">Custo Total</p>
              <p className="text-2xl font-bold">
                {dashboard.totais.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Grafico de Consumo por Equipamento */}
          {dashboard.graficos.consumo_por_equipamento.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Consumo por Equipamento (Top 10)
              </h2>
              <div className="space-y-3">
                {dashboard.graficos.consumo_por_equipamento.map((item, idx) => {
                  const maxLitros = Math.max(...dashboard.graficos.consumo_por_equipamento.map((i) => i.litros));
                  const percent = (item.litros / maxLitros) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-gray-700 truncate">
                        {item.codigo}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(percent, 5)}%` }}
                        >
                          <span className="text-xs font-semibold text-white">
                            {item.litros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alertas de Manutencao */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Alertas de Manutencao Preventiva</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {dashboard.alertas.criticos} criticos, {dashboard.alertas.urgentes} urgentes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                  {dashboard.alertas.criticos} Criticos
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                  {dashboard.alertas.urgentes} Urgentes
                </span>
              </div>
            </div>

            {dashboard.alertas.lista.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg">Nenhum alerta de manutencao no momento.</p>
                <p className="text-sm mt-1">Todos os equipamentos estao dentro do plano de manutencao.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipamento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leitura Atual</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proxima</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diferenca</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboard.alertas.lista.map((alerta, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{alerta.codigo}</p>
                            <p className="text-xs text-gray-500">{alerta.tipo_equipamento}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{alerta.item}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPrioridadeColor(alerta.prioridade)}`}>
                            {alerta.prioridade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {alerta.leitura_atual.toFixed(0)} {alerta.unidade}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {alerta.proxima_leitura.toFixed(0)} {alerta.unidade}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${alerta.diferenca <= 0 ? 'text-red-600' : alerta.diferenca <= 25 ? 'text-orange-600' : 'text-yellow-600'}`}>
                            {alerta.diferenca.toFixed(0)} {alerta.unidade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/equipamentos/${alerta.equipamento_id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detalhes CPH por Equipamento */}
          {dashboard.metricas.cph.detalhes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Detalhamento CPH por Equipamento</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Custo por hora detalhado dos equipamentos com maior CPH
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipamento</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Combustivel</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mao de Obra</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pecas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Horas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CPH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboard.metricas.cph.detalhes.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.codigo}</p>
                            <p className="text-xs text-gray-500">{item.tipo}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          R$ {item.custo_combustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          R$ {item.custo_mao_obra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          R$ {item.custo_pecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          R$ {item.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {item.horas_trabalhadas.toFixed(0)}h
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                          R$ {item.cph.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Equipamentos Parados */}
          {dashboard.metricas.utilizacao_frota.equipamentos_parados.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Equipamentos Parados</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Equipamentos sem atividade no periodo selecionado
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leitura Atual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboard.metricas.utilizacao_frota.equipamentos_parados.map((eq, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{eq.codigo}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{eq.descricao || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{eq.tipo__nome || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{eq.leitura_atual || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/equipamentos/${eq.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
