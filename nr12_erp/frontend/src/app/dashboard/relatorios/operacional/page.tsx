'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RelatorioData {
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
  orcamentos: {
    total: number;
    aprovados: number;
    rejeitados: number;
    valor_total: number;
    taxa_aprovacao: number;
  };
  ordens_servico: {
    total: number;
    abertas: number;
    em_execucao: number;
    concluidas: number;
    canceladas: number;
    valor_total: number;
    valor_medio: number;
    tempo_medio_execucao_dias: number | null;
  };
  manutencoes: {
    total: number;
    preventivas: number;
    corretivas: number;
    percentual_preventivas: number;
  };
  equipamentos: {
    atendidos: number;
    top_5_manutencoes: Array<{
      equipamento__id: number;
      equipamento__codigo: string;
      equipamento__descricao: string;
      total_manutencoes: number;
    }>;
  };
  tecnicos: {
    top_5_ativos: Array<{
      tecnico_responsavel__id: number;
      tecnico_responsavel__nome: string;
      total_os: number;
    }>;
  };
  graficos: {
    manutencoes_por_mes: Array<{
      mes: string;
      total: number;
    }>;
  };
  recentes: {
    ordens_servico: Array<any>;
    manutencoes: Array<any>;
  };
}

export default function RelatorioOperacionalPage() {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<RelatorioData | null>(null);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    cliente: '',
    empreendimento: '',
    equipamento: '',
    tecnico: '',
  });
  const [clientes, setClientes] = useState<any[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  useEffect(() => {
    loadSelects();
    loadRelatorio();
  }, []);

  async function loadSelects() {
    try {
      const [clientesRes, tecnicosRes] = await Promise.all([
        fetch('/api/proxy/cadastro/clientes/', { credentials: 'include' }),
        fetch('/api/proxy/tecnicos/', { credentials: 'include' }),
      ]);

      if (clientesRes.ok) {
        const data = await clientesRes.json();
        setClientes(data.results || []);
      }
      if (tecnicosRes.ok) {
        const data = await tecnicosRes.json();
        setTecnicos(data.results || []);
      }
    } catch (error) {
      console.error('Erro ao carregar selects:', error);
    }
  }

  // Carregar empreendimentos quando cliente mudar
  useEffect(() => {
    if (filtros.cliente) {
      loadEmpreendimentos(filtros.cliente);
    } else {
      setEmpreendimentos([]);
      setFiltros(prev => ({ ...prev, empreendimento: '', equipamento: '' }));
    }
  }, [filtros.cliente]);

  // Carregar equipamentos quando empreendimento mudar
  useEffect(() => {
    if (filtros.empreendimento) {
      loadEquipamentos(filtros.empreendimento);
    } else if (filtros.cliente) {
      loadEquipamentos('', filtros.cliente);
    } else {
      setEquipamentos([]);
      setFiltros(prev => ({ ...prev, equipamento: '' }));
    }
  }, [filtros.empreendimento, filtros.cliente]);

  async function loadEmpreendimentos(clienteId: string) {
    try {
      const response = await fetch(`/api/proxy/cadastro/empreendimentos/?cliente=${clienteId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setEmpreendimentos(data.results || []);
      }
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
    }
  }

  async function loadEquipamentos(empreendimentoId?: string, clienteId?: string) {
    try {
      let url = '/api/proxy/equipamentos/equipamentos/';
      const params = new URLSearchParams();

      if (empreendimentoId) {
        params.append('empreendimento', empreendimentoId);
      } else if (clienteId) {
        params.append('cliente', clienteId);
      }

      const query = params.toString();
      if (query) url += `?${query}`;

      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setEquipamentos(data.results || []);
      }
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  }

  async function loadRelatorio() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.cliente) params.append('cliente', filtros.cliente);
      if (filtros.empreendimento) params.append('empreendimento', filtros.empreendimento);
      if (filtros.equipamento) params.append('equipamento', filtros.equipamento);
      if (filtros.tecnico) params.append('tecnico', filtros.tecnico);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/proxy/relatorios/operacional/${query}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar relatório');
      }

      const data = await response.json();
      setDados(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFiltrar() {
    loadRelatorio();
  }

  function handleImprimir() {
    window.print();
  }

  function handleExportarPDF() {
    if (!dados) return;

    const doc = new jsPDF('landscape');

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Operacional', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Visão geral das operações e manutenções', 14, 28);

    // Período
    doc.setFontSize(10);
    const periodoTexto = `Período: ${new Date(dados.periodo.data_inicio).toLocaleDateString('pt-BR')} até ${new Date(dados.periodo.data_fim).toLocaleDateString('pt-BR')}`;
    doc.text(periodoTexto, 14, 34);

    // Data de geração
    doc.setFontSize(9);
    doc.setTextColor(100);
    const dataGeracao = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(dataGeracao, 14, 39);
    doc.setTextColor(0);

    let yPosition = 48;

    // Estatísticas - Orçamentos
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Orçamentos', 14, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const orcStats = [
      `Total: ${dados.orcamentos.total}`,
      `Aprovados: ${dados.orcamentos.aprovados}`,
      `Rejeitados: ${dados.orcamentos.rejeitados}`,
      `Taxa Aprovação: ${dados.orcamentos.taxa_aprovacao.toFixed(1)}%`,
      `Valor Total: ${dados.orcamentos.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    ];

    orcStats.forEach((stat, index) => {
      const col = index % 5;
      doc.text(stat, 14 + (col * 55), yPosition);
    });

    yPosition += 8;

    // Estatísticas - Ordens de Serviço
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Ordens de Serviço', 14, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const osStats = [
      `Total: ${dados.ordens_servico.total}`,
      `Abertas: ${dados.ordens_servico.abertas}`,
      `Em Execução: ${dados.ordens_servico.em_execucao}`,
      `Concluídas: ${dados.ordens_servico.concluidas}`,
      `Valor Total: ${dados.ordens_servico.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    ];

    osStats.forEach((stat, index) => {
      const col = index % 5;
      doc.text(stat, 14 + (col * 55), yPosition);
    });

    yPosition += 8;

    // Estatísticas - Manutenções
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Manutenções', 14, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const manutStats = [
      `Total: ${dados.manutencoes.total}`,
      `Preventivas: ${dados.manutencoes.preventivas}`,
      `Corretivas: ${dados.manutencoes.corretivas}`,
      `Índice Preventivas: ${dados.manutencoes.percentual_preventivas.toFixed(1)}%`,
    ];

    manutStats.forEach((stat, index) => {
      const col = index % 4;
      doc.text(stat, 14 + (col * 68), yPosition);
    });

    yPosition += 10;

    // Tabela de Top 5 Equipamentos
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 5 Equipamentos - Mais Manutenções', 14, yPosition);
    yPosition += 5;

    const equipData = dados.equipamentos.top_5_manutencoes.map((eq) => [
      eq.equipamento__codigo,
      eq.equipamento__descricao,
      eq.total_manutencoes.toString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Código', 'Descrição', 'Total Manutenções']],
      body: equipData,
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
      tableWidth: 120,
    });

    // Tabela de Top 5 Técnicos
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 5 Técnicos - Mais Ativos', 14, yPosition);
    yPosition += 5;

    const tecData = dados.tecnicos.top_5_ativos.map((tec) => [
      tec.tecnico_responsavel__nome,
      tec.total_os.toString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Técnico', 'Total OS']],
      body: tecData,
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
      tableWidth: 100,
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

  if (!dados) {
    return (
      <div className="p-6">
        <div className="text-gray-900">Erro ao carregar relatório</div>
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
            <h1 className="text-xl font-bold text-gray-900">Relatório Operacional</h1>
            <p className="text-sm text-gray-900 mt-1">Visão geral das operações e manutenções</p>
            <p className="text-xs text-gray-600 mt-1">
              Período: {new Date(dados.periodo.data_inicio).toLocaleDateString('pt-BR')} até{' '}
              {new Date(dados.periodo.data_fim).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório Operacional</h1>
          <p className="text-gray-900 mt-1">
            Período: {new Date(dados.periodo.data_inicio).toLocaleDateString('pt-BR')} até{' '}
            {new Date(dados.periodo.data_fim).toLocaleDateString('pt-BR')}
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
              Cliente
            </label>
            <select
              value={filtros.cliente}
              onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome_razao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Empreendimento
            </label>
            <select
              value={filtros.empreendimento}
              onChange={(e) => setFiltros({ ...filtros, empreendimento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="">Todos</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
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
                cliente: '',
                empreendimento: '',
                equipamento: '',
                tecnico: '',
              });
              // Recarregar após limpar
              setTimeout(() => loadRelatorio(), 100);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Cards de Orçamentos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Orçamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Total</div>
            <div className="text-2xl font-bold text-gray-900">{dados.orcamentos.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Aprovados</div>
            <div className="text-2xl font-bold text-green-600">{dados.orcamentos.aprovados}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Rejeitados</div>
            <div className="text-2xl font-bold text-red-600">{dados.orcamentos.rejeitados}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Valor Total</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.orcamentos.valor_total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Taxa Aprovação</div>
            <div className="text-2xl font-bold text-blue-600">{dados.orcamentos.taxa_aprovacao}%</div>
          </div>
        </div>
      </div>

      {/* Cards de Ordens de Serviço */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Ordens de Serviço</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Total</div>
            <div className="text-2xl font-bold text-gray-900">{dados.ordens_servico.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Abertas</div>
            <div className="text-2xl font-bold text-yellow-600">{dados.ordens_servico.abertas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Em Execução</div>
            <div className="text-2xl font-bold text-blue-600">{dados.ordens_servico.em_execucao}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Concluídas</div>
            <div className="text-2xl font-bold text-green-600">{dados.ordens_servico.concluidas}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Canceladas</div>
            <div className="text-2xl font-bold text-red-600">{dados.ordens_servico.canceladas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Valor Total</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.ordens_servico.valor_total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Valor Médio</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.ordens_servico.valor_medio.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Tempo Médio (dias)</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.ordens_servico.tempo_medio_execucao_dias ?? '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Manutenções */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Manutenções</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Total</div>
            <div className="text-2xl font-bold text-gray-900">{dados.manutencoes.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Preventivas</div>
            <div className="text-2xl font-bold text-blue-600">{dados.manutencoes.preventivas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Corretivas</div>
            <div className="text-2xl font-bold text-orange-600">{dados.manutencoes.corretivas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">% Preventivas</div>
            <div className="text-2xl font-bold text-green-600">{dados.manutencoes.percentual_preventivas}%</div>
          </div>
        </div>
      </div>

      {/* Top 5 Equipamentos e Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Equipamentos */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Top 5 Equipamentos (Manutenções)</h3>
          <div className="space-y-2">
            {dados.equipamentos.top_5_manutencoes.map((eq) => (
              <div key={eq.equipamento__id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-gray-900">{eq.equipamento__codigo}</div>
                  <div className="text-sm text-gray-900">{eq.equipamento__descricao}</div>
                </div>
                <div className="text-lg font-bold text-blue-600">{eq.total_manutencoes}</div>
              </div>
            ))}
            {dados.equipamentos.top_5_manutencoes.length === 0 && (
              <div className="text-gray-900 text-center py-4">Nenhum equipamento encontrado</div>
            )}
          </div>
        </div>

        {/* Top Técnicos */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Top 5 Técnicos (OS)</h3>
          <div className="space-y-2">
            {dados.tecnicos.top_5_ativos.map((tec) => (
              <div key={tec.tecnico_responsavel__id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{tec.tecnico_responsavel__nome}</div>
                <div className="text-lg font-bold text-green-600">{tec.total_os}</div>
              </div>
            ))}
            {dados.tecnicos.top_5_ativos.length === 0 && (
              <div className="text-gray-900 text-center py-4">Nenhum técnico encontrado</div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Manutenções por Mês */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Manutenções por Mês</h3>
        <div className="flex items-end gap-2 h-64">
          {dados.graficos.manutencoes_por_mes.map((item) => {
            const maxValue = Math.max(...dados.graficos.manutencoes_por_mes.map(d => d.total), 1);
            const heightPercentage = (item.total / maxValue) * 100;

            return (
              <div key={item.mes} className="flex-1 flex flex-col items-center">
                <div className="text-sm font-bold text-gray-900 mb-1">{item.total}</div>
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${heightPercentage}%` }}
                ></div>
                <div className="text-xs text-gray-900 mt-2">{item.mes}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabelas de Recentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OS Recentes */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Ordens de Serviço Recentes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Número</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Cliente</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.recentes.ordens_servico.map((os) => (
                  <tr key={os.id} className="border-b">
                    <td className="py-2 text-sm text-gray-900">{os.numero}</td>
                    <td className="py-2 text-sm text-gray-900">{os.cliente__nome_razao}</td>
                    <td className="py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        os.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800' :
                        os.status === 'EM_EXECUCAO' ? 'bg-blue-100 text-blue-800' :
                        os.status === 'ABERTA' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {os.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manutenções Recentes */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Manutenções Recentes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Equipamento</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Tipo</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {dados.recentes.manutencoes.map((man, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 text-sm text-gray-900">{man.equipamento__codigo}</td>
                    <td className="py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        man.tipo === 'preventiva' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {man.tipo}
                      </span>
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {new Date(man.data).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            margin-top: 0.8rem !important;
          }

          /* Cards de estatísticas */
          .bg-white {
            background-color: #ffffff !important;
            border: 1px solid #e5e7eb !important;
          }

          .bg-gray-50 {
            background-color: #f9fafb !important;
          }

          /* Títulos e cabeçalhos */
          h1,
          h2,
          h3 {
            page-break-after: avoid;
            color: #1f2937 !important;
            font-size: 14pt;
            margin-bottom: 0.5rem !important;
          }

          h2 {
            font-size: 12pt;
          }

          h3 {
            font-size: 11pt;
          }

          /* Tabelas */
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
            font-size: 8pt;
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
            padding: 6px 4px !important;
            border-bottom: 2px solid #9ca3af !important;
            font-size: 8pt;
          }

          td {
            padding: 4px !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          /* Cards de estatísticas para impressão */
          .grid {
            display: grid !important;
          }

          .grid-cols-1.md\\:grid-cols-5 {
            grid-template-columns: repeat(5, 1fr) !important;
          }

          .grid-cols-1.md\\:grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }

          .grid-cols-1.md\\:grid-cols-3 {
            grid-template-columns: repeat(3, 1fr) !important;
          }

          .grid-cols-1.md\\:grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .gap-4 {
            gap: 0.4rem !important;
          }

          .gap-6 {
            gap: 0.6rem !important;
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

          .text-red-600 {
            color: #dc2626 !important;
          }

          .text-yellow-600 {
            color: #ca8a04 !important;
          }

          .text-gray-900 {
            color: #111827 !important;
          }

          /* Badges de status */
          .bg-green-100 {
            background-color: #d1fae5 !important;
          }

          .text-green-800 {
            color: #065f46 !important;
          }

          .bg-blue-100 {
            background-color: #dbeafe !important;
          }

          .text-blue-800 {
            color: #1e40af !important;
          }

          .bg-yellow-100 {
            background-color: #fef3c7 !important;
          }

          .text-yellow-800 {
            color: #92400e !important;
          }

          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }

          .text-gray-800 {
            color: #1f2937 !important;
          }

          .bg-orange-100 {
            background-color: #ffedd5 !important;
          }

          .text-orange-800 {
            color: #9a3412 !important;
          }

          /* Evitar quebras de página indesejadas */
          .bg-white.p-4,
          .bg-white.rounded-lg {
            page-break-inside: avoid;
          }

          /* Gráficos e visualizações */
          .h-64 {
            height: 150px !important;
          }

          /* Ajustar padding e margens para impressão */
          .p-4 {
            padding: 0.5rem !important;
          }

          .mb-3,
          .mt-3 {
            margin-bottom: 0.4rem !important;
            margin-top: 0.4rem !important;
          }

          /* Cards menores para caber mais na página */
          .text-2xl {
            font-size: 16pt !important;
          }

          .text-sm {
            font-size: 8pt !important;
          }

          .text-xs {
            font-size: 7pt !important;
          }
        }
      `}</style>
    </div>
  );
}
