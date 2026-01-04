'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  function handleImprimir() {
    window.print();
  }

  function handleExportarPDF() {
    const doc = new jsPDF('landscape');

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Manutenções', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Histórico e análise de manutenções realizadas', 14, 28);

    // Período
    if (filtros.data_inicio || filtros.data_fim) {
      doc.setFontSize(10);
      const periodoTexto = `Período: ${filtros.data_inicio ? new Date(filtros.data_inicio).toLocaleDateString('pt-BR') : '...'} até ${filtros.data_fim ? new Date(filtros.data_fim).toLocaleDateString('pt-BR') : '...'}`;
      doc.text(periodoTexto, 14, 34);
    }

    // Data de geração
    doc.setFontSize(9);
    doc.setTextColor(100);
    const dataGeracao = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(dataGeracao, 14, filtros.data_inicio || filtros.data_fim ? 39 : 34);
    doc.setTextColor(0);

    let yPosition = filtros.data_inicio || filtros.data_fim ? 48 : 43;

    // Estatísticas
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const stats = [
      `Total de Manutenções: ${estatisticas.total}`,
      `Preventivas: ${estatisticas.preventivas}`,
      `Corretivas: ${estatisticas.corretivas}`,
      `Índice de Preventivas: ${estatisticas.percentual_preventivas}%`,
    ];

    stats.forEach((stat, index) => {
      const col = index % 4;
      doc.text(stat, 14 + (col * 68), yPosition);
    });

    yPosition += 10;

    // Tabela de manutenções
    const tableData = manutencoes.map((manut) => [
      new Date(manut.data).toLocaleDateString('pt-BR'),
      manut.equipamento_nome || '-',
      manut.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva',
      manut.tecnico_nome || '-',
      manut.descricao || '-',
      manut.horimetro ? parseFloat(manut.horimetro).toLocaleString('pt-BR') : '-',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Data', 'Equipamento', 'Tipo', 'Técnico', 'Descrição', 'Horímetro']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: 14, right: 14 },
    });

    // Abrir PDF em nova aba para visualização
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
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
            <h1 className="text-xl font-bold text-gray-900">Relatório de Manutenções</h1>
            <p className="text-sm text-gray-900 mt-1">Histórico e análise de manutenções realizadas</p>
            {(filtros.data_inicio || filtros.data_fim) && (
              <p className="text-xs text-gray-600 mt-1">
                Período: {filtros.data_inicio ? new Date(filtros.data_inicio).toLocaleDateString('pt-BR') : '...'} até{' '}
                {filtros.data_fim ? new Date(filtros.data_fim).toLocaleDateString('pt-BR') : '...'}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Manutenções</h1>
          <p className="text-gray-900 mt-1">
            Histórico e análise de manutenções realizadas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportarPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Visualizar PDF
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
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
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

      <style jsx global>{`
        @media print {
          /* Esconder elementos específicos de navegação */
          nav,
          aside,
          .sidebar,
          [class*="sidebar"],
          [class*="navigation"],
          [role="navigation"]:not(.print-keep),
          [role="complementary"] {
            display: none !important;
          }

          /* Esconder elementos não necessários na impressão */
          .no-print {
            display: none !important;
          }

          /* Resetar body e html para impressão */
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Garantir cores precisas */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Configuração da página */
          @page {
            margin: 1.5cm 2cm;
            size: A4 landscape;
          }

          body {
            font-size: 10pt;
          }

          /* Espaçamento geral */
          .p-6 {
            padding: 0 !important;
          }

          .space-y-6 > * + * {
            margin-top: 1rem !important;
          }

          /* Cards de estatísticas */
          .bg-white {
            background-color: #ffffff !important;
            border: 1px solid #e5e7eb !important;
          }

          /* Títulos e cabeçalhos */
          h1,
          h2,
          h3 {
            page-break-after: avoid;
            color: #1f2937 !important;
          }

          /* Tabelas */
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
            font-size: 9pt;
          }

          thead {
            display: table-header-group;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          th {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
            font-weight: 600;
            padding: 8px 6px !important;
            border-bottom: 2px solid #9ca3af !important;
          }

          td {
            padding: 6px !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          /* Cards de estatísticas para impressão */
          .grid {
            display: grid !important;
          }

          .grid-cols-1 {
            grid-template-columns: repeat(4, 1fr) !important;
          }

          .gap-4 {
            gap: 0.5rem !important;
          }

          .rounded-lg {
            border-radius: 4px !important;
          }

          .shadow-sm {
            box-shadow: none !important;
          }

          /* Cores das métricas */
          .text-blue-600 {
            color: #2563eb !important;
          }

          .text-green-600 {
            color: #059669 !important;
          }

          .text-orange-600 {
            color: #ea580c !important;
          }

          .text-gray-900 {
            color: #111827 !important;
          }

          /* Badges de tipo */
          .bg-blue-100 {
            background-color: #dbeafe !important;
          }

          .text-blue-800 {
            color: #1e40af !important;
          }

          .bg-orange-100 {
            background-color: #ffedd5 !important;
          }

          .text-orange-800 {
            color: #9a3412 !important;
          }

          /* Evitar quebras de página indesejadas */
          .bg-white.p-4 {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
