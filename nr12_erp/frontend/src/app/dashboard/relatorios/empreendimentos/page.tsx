'use client';

import { useState, useEffect } from 'react';
import {
  clientesApi,
  empreendimentosApi,
  equipamentosApi,
  abastecimentosApi,
  manutencoesApi,
  type Cliente,
  type Empreendimento
} from '@/lib/api';

interface DadosEmpreendimento {
  empreendimento: Empreendimento;
  equipamentos: number;
  total_horas: number;
  total_abastecimento_litros: number;
  total_abastecimento_valor: number;
  total_manutencao_valor: number;
  custo_total: number;
  custo_por_hora: number;
}

export default function RelatorioEmpreendimentosPage() {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState({
    data_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [empreendimentosFiltrados, setEmpreendimentosFiltrados] = useState<Empreendimento[]>([]);
  const [dadosEmpreendimentos, setDadosEmpreendimentos] = useState<DadosEmpreendimento[]>([]);
  const [filtros, setFiltros] = useState({
    cliente: null as number | null,
    empreendimento: null as number | null,
  });
  const [resumoGeral, setResumoGeral] = useState({
    total_horas: 0,
    total_abastecimento_litros: 0,
    total_abastecimento_valor: 0,
    total_manutencao_valor: 0,
    custo_total: 0,
  });

  useEffect(() => {
    loadClientes();
    loadEmpreendimentos();
  }, []);

  useEffect(() => {
    // Filtrar empreendimentos quando cliente muda
    if (filtros.cliente) {
      const empsFiltrados = empreendimentos.filter(e => e.cliente === filtros.cliente);
      setEmpreendimentosFiltrados(empsFiltrados);
      // Resetar empreendimento se não pertence ao cliente selecionado
      if (filtros.empreendimento && !empsFiltrados.some(e => e.id === filtros.empreendimento)) {
        setFiltros(prev => ({ ...prev, empreendimento: null }));
      }
    } else {
      setEmpreendimentosFiltrados(empreendimentos);
    }
  }, [filtros.cliente, empreendimentos]);

  useEffect(() => {
    if (empreendimentos.length > 0) {
      loadRelatorio();
    }
  }, [periodo, empreendimentos, filtros]);

  async function loadClientes() {
    try {
      const data = await clientesApi.list({});
      setClientes(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  async function loadEmpreendimentos() {
    try {
      const data = await empreendimentosApi.list({});
      setEmpreendimentos(data.results || []);
      setEmpreendimentosFiltrados(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
    }
  }

  async function loadRelatorio() {
    try {
      setLoading(true);
      const dados: DadosEmpreendimento[] = [];

      // Filtrar empreendimentos baseado nos filtros
      let empreendimentosParaProcessar = empreendimentos;

      if (filtros.cliente) {
        empreendimentosParaProcessar = empreendimentosParaProcessar.filter(e => e.cliente === filtros.cliente);
      }

      if (filtros.empreendimento) {
        empreendimentosParaProcessar = empreendimentosParaProcessar.filter(e => e.id === filtros.empreendimento);
      }

      for (const emp of empreendimentosParaProcessar) {
        // Buscar equipamentos do empreendimento
        const equipamentosData = await equipamentosApi.list({
          empreendimento: emp.id,
        } as any);
        const equipamentos = equipamentosData.results || [];
        const equipamentosIds = equipamentos.map(e => e.id);

        if (equipamentosIds.length === 0) {
          dados.push({
            empreendimento: emp,
            equipamentos: 0,
            total_horas: 0,
            total_abastecimento_litros: 0,
            total_abastecimento_valor: 0,
            total_manutencao_valor: 0,
            custo_total: 0,
            custo_por_hora: 0,
          });
          continue;
        }

        // Buscar abastecimentos do período
        const abastecimentosData = await abastecimentosApi.list({
          data_inicio: periodo.data_inicio,
          data_fim: periodo.data_fim,
        } as any);
        const abastecimentos = (abastecimentosData.results || abastecimentosData || []).filter((a: any) =>
          equipamentosIds.includes(a.equipamento)
        );

        // Buscar manutenções do período
        const manutencoesData = await manutencoesApi.list() as any;
        const manutencoes = (manutencoesData.results || manutencoesData || []).filter((m: any) =>
          equipamentosIds.includes(m.equipamento)
        );

        // Calcular totais
        const total_horas = abastecimentos.reduce((sum: any, a: any) =>
          sum + Number((a as any).horimetro_atual || 0), 0
        );
        const total_abastecimento_litros = abastecimentos.reduce((sum: any, a: any) =>
          sum + Number((a as any).quantidade || 0), 0
        );
        const total_abastecimento_valor = abastecimentos.reduce((sum: any, a: any) =>
          sum + Number(a.valor_total || 0), 0
        );
        const total_manutencao_valor = manutencoes.reduce((sum: any, m: any) =>
          sum + Number((m as any).custo_total || 0), 0
        );
        const custo_total = total_abastecimento_valor + total_manutencao_valor;
        const custo_por_hora = total_horas > 0 ? custo_total / total_horas : 0;

        dados.push({
          empreendimento: emp,
          equipamentos: equipamentos.length,
          total_horas,
          total_abastecimento_litros,
          total_abastecimento_valor,
          total_manutencao_valor,
          custo_total,
          custo_por_hora,
        });
      }

      // Calcular resumo geral
      const resumo = {
        total_horas: dados.reduce((sum, d) => sum + d.total_horas, 0),
        total_abastecimento_litros: dados.reduce((sum, d) => sum + d.total_abastecimento_litros, 0),
        total_abastecimento_valor: dados.reduce((sum, d) => sum + d.total_abastecimento_valor, 0),
        total_manutencao_valor: dados.reduce((sum, d) => sum + d.total_manutencao_valor, 0),
        custo_total: dados.reduce((sum, d) => sum + d.custo_total, 0),
      };

      setDadosEmpreendimentos(dados);
      setResumoGeral(resumo);
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
    const headers = [
      'Empreendimento',
      'Cliente',
      'Equipamentos',
      'Total Horas',
      'Abast. Litros',
      'Abast. Valor (R$)',
      'Manutenção (R$)',
      'Custo Total (R$)',
      'Custo/Hora (R$)',
    ];

    const rows = dadosEmpreendimentos.map(d => [
      d.empreendimento.nome,
      d.empreendimento.cliente_nome || '',
      d.equipamentos,
      d.total_horas.toFixed(2),
      d.total_abastecimento_litros.toFixed(2),
      d.total_abastecimento_valor.toFixed(2),
      d.total_manutencao_valor.toFixed(2),
      d.custo_total.toFixed(2),
      d.custo_por_hora.toFixed(2),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_empreendimentos_${periodo.data_inicio}_${periodo.data_fim}.csv`;
    link.click();
  }

  // Dados já vêm filtrados do loadRelatorio
  const dadosFiltrados = dadosEmpreendimentos;

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
            <h1 className="text-xl font-bold text-gray-900">Relatório por Empreendimento</h1>
            <p className="text-sm text-gray-900 mt-1">
              Análise detalhada de horas, abastecimento e manutenção
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório por Empreendimento</h1>
          <p className="text-sm text-gray-900 mt-1">
            Análise detalhada de horas, abastecimento e manutenção
          </p>
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={periodo.data_inicio}
              onChange={(e) => setPeriodo({ ...periodo, data_inicio: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={periodo.data_fim}
              onChange={(e) => setPeriodo({ ...periodo, data_fim: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Cliente
            </label>
            <select
              value={filtros.cliente || ''}
              onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            >
              <option value="">Todos os Clientes</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome_razao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Empreendimento
            </label>
            <select
              value={filtros.empreendimento || ''}
              onChange={(e) => setFiltros({ ...filtros, empreendimento: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
              disabled={!filtros.cliente && empreendimentosFiltrados.length === 0}
            >
              <option value="">Todos os Empreendimentos</option>
              {empreendimentosFiltrados.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>
            {filtros.cliente && empreendimentosFiltrados.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Nenhum empreendimento para este cliente</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Total Horas</p>
          <p className="text-2xl font-bold text-gray-900">
            {resumoGeral.total_horas.toFixed(2)}h
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Total Abast. (L)</p>
          <p className="text-2xl font-bold text-blue-900">
            {resumoGeral.total_abastecimento_litros.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Custo Abast.</p>
          <p className="text-xl font-bold text-orange-900">
            R$ {Number(resumoGeral.total_abastecimento_valor).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Custo Manutenção</p>
          <p className="text-xl font-bold text-red-900">
            R$ {Number(resumoGeral.total_manutencao_valor).toFixed(2)}
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg shadow">
          <p className="text-sm text-white">Custo Total</p>
          <p className="text-xl font-bold text-white">
            R$ {Number(resumoGeral.custo_total).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : dadosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            Nenhum empreendimento encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Empreendimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Equipamentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Total Horas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Abast. (L)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Abast. Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Manutenção
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Custo Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                    Custo/Hora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dadosFiltrados.map((dado) => (
                  <tr key={dado.empreendimento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {dado.empreendimento.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {dado.empreendimento.cliente_nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {dado.equipamentos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dado.total_horas.toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900">
                      {dado.total_abastecimento_litros.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-900">
                      R$ {Number(dado.total_abastecimento_valor).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-900">
                      R$ {Number(dado.total_manutencao_valor).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      R$ {Number(dado.custo_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-900 font-medium">
                      R$ {Number(dado.custo_por_hora).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {!filtros.empreendimento && dadosFiltrados.length > 1 && (
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-6 py-4 text-sm text-gray-900" colSpan={3}>
                      TOTAL GERAL
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {resumoGeral.total_horas.toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-900">
                      {resumoGeral.total_abastecimento_litros.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-orange-900">
                      R$ {Number(resumoGeral.total_abastecimento_valor).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-900">
                      R$ {Number(resumoGeral.total_manutencao_valor).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      R$ {Number(resumoGeral.custo_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-purple-900">
                      R$ {resumoGeral.total_horas > 0 ? (resumoGeral.custo_total / resumoGeral.total_horas).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Período do Relatório */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg print-only">
        <p className="text-sm text-gray-900">
          <span className="font-semibold">Período:</span> {new Date(periodo.data_inicio).toLocaleDateString('pt-BR')} a {new Date(periodo.data_fim).toLocaleDateString('pt-BR')}
        </p>
        {filtros.cliente && (
          <p className="text-sm text-gray-900 mt-1">
            <span className="font-semibold">Cliente:</span> {clientes.find(c => c.id === filtros.cliente)?.nome_razao || '-'}
          </p>
        )}
        {filtros.empreendimento && (
          <p className="text-sm text-gray-900 mt-1">
            <span className="font-semibold">Empreendimento:</span> {empreendimentos.find(e => e.id === filtros.empreendimento)?.nome || '-'}
          </p>
        )}
        <p className="text-sm text-gray-900 mt-1">
          <span className="font-semibold">Data de emissão:</span> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1.5cm;
            size: A4 landscape;
          }
          table {
            font-size: 9px;
          }
          th, td {
            padding: 4px 6px !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
    </div>
  );
}
