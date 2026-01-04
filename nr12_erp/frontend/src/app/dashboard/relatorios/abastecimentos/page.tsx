'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Abastecimento {
  id: number;
  equipamento: number;
  equipamento_codigo: string;
  equipamento_descricao: string;
  data: string;
  horimetro_km: string;
  quantidade_litros: string;
  valor_unitario: string;
  valor_total: string;
  local: string;
  observacoes: string;
  horimetro_km_anterior?: string;
  data_anterior?: string;
  quantidade_litros_anterior?: string;
}

interface ConsumoCalculado {
  litros_por_hora?: number;
  km_por_litro?: number;
  horas_decorridas?: number;
  km_percorridos?: number;
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
    media_litros_por_hora: 0,
    media_km_por_litro: 0,
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
      let abastecimentosData = data.results || [];

      // Ordenar por equipamento e depois por data para calcular consumo corretamente
      abastecimentosData = abastecimentosData.sort((a: Abastecimento, b: Abastecimento) => {
        if (a.equipamento !== b.equipamento) {
          return a.equipamento - b.equipamento;
        }
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      });

      setAbastecimentos(abastecimentosData);

      // Calcular estatísticas básicas
      const total_litros = abastecimentosData.reduce((sum: number, a: Abastecimento) => {
        const litros = parseFloat(a.quantidade_litros || '0');
        return sum + (isNaN(litros) ? 0 : litros);
      }, 0);
      const total_valor = abastecimentosData.reduce((sum: number, a: Abastecimento) => {
        const valor = parseFloat(a.valor_total || '0');
        return sum + (isNaN(valor) ? 0 : valor);
      }, 0);
      const media_preco = total_litros > 0 ? total_valor / total_litros : 0;

      // Calcular métricas de consumo
      let soma_litros_por_hora = 0;
      let count_litros_por_hora = 0;
      let soma_km_por_litro = 0;
      let count_km_por_litro = 0;

      abastecimentosData.forEach((abast: Abastecimento, index: number) => {
        if (index === 0) return; // Pular primeiro abastecimento

        const abastAnterior = abastecimentosData[index - 1];

        // Verificar se é o mesmo equipamento
        if (abast.equipamento !== abastAnterior.equipamento) return;

        const horimetro_atual = parseFloat(abast.horimetro_km || '0');
        const horimetro_anterior = parseFloat(abastAnterior.horimetro_km || '0');
        const litros_atual = parseFloat(abast.quantidade_litros || '0');

        if (isNaN(horimetro_atual) || isNaN(horimetro_anterior) || isNaN(litros_atual)) return;
        if (litros_atual <= 0) return;

        const diferenca = horimetro_atual - horimetro_anterior;
        if (diferenca <= 0) return;

        // Detectar automaticamente se é horímetro ou hodômetro pela magnitude da diferença
        // Horímetro: diferenças pequenas (até 500 horas entre abastecimentos)
        // Hodômetro: diferenças maiores (centenas ou milhares de km)
        if (diferenca <= 500) {
          // Horímetro (horas) - calcular consumo em litros por hora
          const litros_por_hora = litros_atual / diferenca;
          soma_litros_por_hora += litros_por_hora;
          count_litros_por_hora++;
        } else {
          // Hodômetro (km) - calcular rendimento em km por litro
          const km_por_litro = diferenca / litros_atual;
          soma_km_por_litro += km_por_litro;
          count_km_por_litro++;
        }
      });

      const media_litros_por_hora = count_litros_por_hora > 0 ? soma_litros_por_hora / count_litros_por_hora : 0;
      const media_km_por_litro = count_km_por_litro > 0 ? soma_km_por_litro / count_km_por_litro : 0;

      setEstatisticas({
        total_litros,
        total_valor,
        media_preco,
        total_abastecimentos: abastecimentosData.length,
        media_litros_por_hora,
        media_km_por_litro,
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

  function handleImprimir() {
    window.print();
  }

  function handleExportarPDF() {
    const doc = new jsPDF('landscape');

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Abastecimentos', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Consumo de combustível por equipamento', 14, 28);

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
      `Total de Abastecimentos: ${estatisticas.total_abastecimentos}`,
      `Total de Litros: ${estatisticas.total_litros.toFixed(2)} L`,
      `Valor Total: ${estatisticas.total_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      `Preço Médio/Litro: ${estatisticas.media_preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    ];

    if (estatisticas.media_litros_por_hora > 0) {
      stats.push(`Consumo Médio (Horímetro): ${estatisticas.media_litros_por_hora.toFixed(2)} L/h`);
    }

    if (estatisticas.media_km_por_litro > 0) {
      stats.push(`Consumo Médio (Hodômetro): ${estatisticas.media_km_por_litro.toFixed(2)} Km/L`);
    }

    stats.forEach((stat, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      doc.text(stat, 14 + (col * 90), yPosition + (row * 5));
    });

    yPosition += Math.ceil(stats.length / 3) * 5 + 8;

    // Tabela de abastecimentos
    const tableData = abastecimentos.map((abast, index) => {
      const consumo = calcularConsumo(abast, index);
      let consumoTexto = '-';

      if (consumo.litros_por_hora) {
        consumoTexto = `${consumo.litros_por_hora.toFixed(2)} L/h`;
      } else if (consumo.km_por_litro) {
        consumoTexto = `${consumo.km_por_litro.toFixed(2)} Km/L`;
      }

      return [
        new Date(abast.data).toLocaleDateString('pt-BR'),
        `${abast.equipamento_codigo} - ${abast.equipamento_descricao}`,
        abast.horimetro_km ? parseFloat(abast.horimetro_km).toLocaleString('pt-BR') : '-',
        `${abast.quantidade_litros ? parseFloat(abast.quantidade_litros).toFixed(2) : '0.00'} L`,
        consumoTexto,
        abast.valor_unitario ? parseFloat(abast.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00',
        abast.valor_total ? parseFloat(abast.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00',
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Data', 'Equipamento', 'Horímetro/KM', 'Quantidade', 'Consumo', 'Valor/Litro', 'Valor Total']],
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

  function calcularConsumo(abast: Abastecimento, index: number): ConsumoCalculado {
    if (index === 0) return {};

    const abastAnterior = abastecimentos[index - 1];
    if (abast.equipamento !== abastAnterior.equipamento) return {};

    const horimetro_atual = parseFloat(abast.horimetro_km || '0');
    const horimetro_anterior = parseFloat(abastAnterior.horimetro_km || '0');
    const litros_atual = parseFloat(abast.quantidade_litros || '0');

    if (isNaN(horimetro_atual) || isNaN(horimetro_anterior) || isNaN(litros_atual)) return {};
    if (litros_atual <= 0) return {};

    const diferenca = horimetro_atual - horimetro_anterior;
    if (diferenca <= 0) return {};

    // Detectar automaticamente se é horímetro ou hodômetro pela magnitude da diferença
    // Horímetro: diferenças pequenas (até 500 horas entre abastecimentos)
    // Hodômetro: diferenças maiores (centenas ou milhares de km)
    if (diferenca <= 500) {
      // Horímetro (horas) - mostrar consumo em litros por hora
      return {
        litros_por_hora: litros_atual / diferenca,
        horas_decorridas: diferenca,
      };
    } else {
      // Hodômetro (km) - mostrar rendimento em km por litro
      return {
        km_por_litro: diferenca / litros_atual,
        km_percorridos: diferenca,
      };
    }
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
            <h1 className="text-xl font-bold text-gray-900">Relatório de Abastecimentos</h1>
            <p className="text-sm text-gray-900 mt-1">Consumo de combustível por equipamento</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Abastecimentos</h1>
          <p className="text-gray-900 mt-1">
            Consumo de combustível por equipamento
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Total de Abastecimentos</div>
          <div className="text-2xl font-bold text-gray-900">{estatisticas.total_abastecimentos}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Total de Litros</div>
          <div className="text-2xl font-bold text-blue-600">{estatisticas.total_litros.toFixed(2)} L</div>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-900">Preço Médio/Litro</div>
          <div className="text-2xl font-bold text-orange-600">
            {estatisticas.media_preco.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </div>
        </div>
        {estatisticas.media_litros_por_hora > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Consumo Médio (Horímetro)</div>
            <div className="text-2xl font-bold text-purple-600">
              {estatisticas.media_litros_por_hora.toFixed(2)} L/h
            </div>
          </div>
        )}
        {estatisticas.media_km_por_litro > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Consumo Médio (Hodômetro)</div>
            <div className="text-2xl font-bold text-indigo-600">
              {estatisticas.media_km_por_litro.toFixed(2)} Km/L
            </div>
          </div>
        )}
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
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Quantidade (L)</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Consumo</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Valor/Litro</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2">Valor Total</th>
                <th className="text-left text-xs font-medium text-gray-900 pb-2 no-print">Local</th>
              </tr>
            </thead>
            <tbody>
              {abastecimentos.map((abast, index) => {
                const consumo = calcularConsumo(abast, index);
                return (
                  <tr key={abast.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 text-sm text-gray-900">
                      {new Date(abast.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {abast.equipamento_codigo} - {abast.equipamento_descricao}
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {abast.horimetro_km ? parseFloat(abast.horimetro_km).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {abast.quantidade_litros ? parseFloat(abast.quantidade_litros).toFixed(2) : '0.00'} L
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {consumo.litros_por_hora && (
                        <span className="text-purple-600 font-medium">
                          {consumo.litros_por_hora.toFixed(2)} L/h
                        </span>
                      )}
                      {consumo.km_por_litro && (
                        <span className="text-indigo-600 font-medium">
                          {consumo.km_por_litro.toFixed(2)} Km/L
                        </span>
                      )}
                      {!consumo.litros_por_hora && !consumo.km_por_litro && '-'}
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {abast.valor_unitario ? parseFloat(abast.valor_unitario).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }) : 'R$ 0,00'}
                    </td>
                    <td className="py-2 text-sm font-semibold text-gray-900">
                      {abast.valor_total ? parseFloat(abast.valor_total).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }) : 'R$ 0,00'}
                    </td>
                    <td className="py-2 text-sm text-gray-900 no-print">{abast.local || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {abastecimentos.length === 0 && (
            <div className="text-center py-8 text-gray-900">
              Nenhum abastecimento encontrado
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
            grid-template-columns: repeat(3, 1fr) !important;
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

          .text-purple-600 {
            color: #9333ea !important;
          }

          .text-indigo-600 {
            color: #4f46e5 !important;
          }

          .text-gray-900 {
            color: #111827 !important;
          }

          /* Evitar quebras de página indesejadas */
          .bg-white.p-4 {
            page-break-inside: avoid;
          }

          /* Rodapé com numeração */
          @page {
            @bottom-right {
              content: "Página " counter(page) " de " counter(pages);
            }
          }
        }
      `}</style>
    </div>
  );
}
