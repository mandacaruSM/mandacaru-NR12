'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { financeiroApi, clientesApi, type ContaReceber, type Cliente } from '@/lib/api';

function formatCurrency(value: number): string {
  return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

export default function EmitirFaturaPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<number | null>(null);
  const [clienteInfo, setClienteInfo] = useState<Cliente | null>(null);
  const [contasDisponiveis, setContasDisponiveis] = useState<ContaReceber[]>([]);
  const [contasSelecionadas, setContasSelecionadas] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContas, setLoadingContas] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (clienteSelecionado) {
      loadContasCliente(clienteSelecionado);
      loadClienteInfo(clienteSelecionado);
    } else {
      setContasDisponiveis([]);
      setContasSelecionadas([]);
      setClienteInfo(null);
    }
  }, [clienteSelecionado]);

  async function loadClientes() {
    try {
      const data = await clientesApi.list({ page_size: 500 });
      setClientes(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  async function loadClienteInfo(clienteId: number) {
    try {
      const data = await clientesApi.get(clienteId);
      setClienteInfo(data);
    } catch (error) {
      console.error('Erro ao carregar info do cliente:', error);
    }
  }

  async function loadContasCliente(clienteId: number) {
    try {
      setLoadingContas(true);
      // Buscar apenas contas ABERTAS e VENCIDAS do cliente
      const data = await financeiroApi.contasReceber.list({ cliente: clienteId });
      const contasAbertas = (data.results || []).filter(
        (c) => c.status === 'ABERTA' || c.status === 'VENCIDA'
      );
      setContasDisponiveis(contasAbertas);
    } catch (error) {
      console.error('Erro ao carregar contas do cliente:', error);
    } finally {
      setLoadingContas(false);
    }
  }

  function toggleConta(contaId: number) {
    setContasSelecionadas((prev) =>
      prev.includes(contaId)
        ? prev.filter((id) => id !== contaId)
        : [...prev, contaId]
    );
  }

  function toggleTodasContas() {
    if (contasSelecionadas.length === contasDisponiveis.length) {
      setContasSelecionadas([]);
    } else {
      setContasSelecionadas(contasDisponiveis.map((c) => c.id!));
    }
  }

  const contasFatura = contasDisponiveis.filter((c) => contasSelecionadas.includes(c.id!));
  const totalFatura = contasFatura.reduce((sum, c) => sum + Number(c.valor_final || c.valor_original || 0), 0);

  function getOrigemDisplay(conta: ContaReceber): string {
    if (conta.orcamento_numero) return `Orçamento #${conta.orcamento_numero}`;
    if (conta.ordem_servico_numero) return `OS #${conta.ordem_servico_numero}`;
    return conta.tipo_display || conta.tipo || '-';
  }

  function handleGerarPDF() {
    if (!clienteInfo || contasFatura.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FATURA', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data de Emissao: ${dataEmissao}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    // Dados do Cliente
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${clienteInfo.nome_razao}`, 14, y);
    y += 5;
    if (clienteInfo.cnpj_cpf) {
      doc.text(`CPF/CNPJ: ${clienteInfo.cnpj_cpf}`, 14, y);
      y += 5;
    }
    if (clienteInfo.email) {
      doc.text(`Email: ${clienteInfo.email}`, 14, y);
      y += 5;
    }
    if (clienteInfo.telefone) {
      doc.text(`Telefone: ${clienteInfo.telefone}`, 14, y);
      y += 5;
    }
    // Endereco
    const endereco = [
      clienteInfo.logradouro,
      clienteInfo.numero ? `nº ${clienteInfo.numero}` : '',
      clienteInfo.complemento,
      clienteInfo.bairro,
      clienteInfo.cidade,
      clienteInfo.uf,
    ].filter(Boolean).join(', ');
    if (endereco) {
      doc.text(`Endereco: ${endereco}`, 14, y);
      y += 5;
    }
    y += 6;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    // Titulo da tabela
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTAS A RECEBER', 14, y);
    y += 6;

    // Tabela de contas
    const tableBody = contasFatura.map((conta) => [
      conta.numero || '-',
      getOrigemDisplay(conta),
      conta.descricao || '-',
      formatDate(conta.data_vencimento),
      formatCurrency(Number(conta.valor_final || conta.valor_original || 0)),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Numero', 'Origem', 'Descricao', 'Vencimento', 'Valor']],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30, halign: 'right' },
      },
      theme: 'striped',
    });

    // Total
    const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
    let ty = finalY + 10;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 80, ty - 2, pageWidth - 14, ty - 2);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(totalFatura)}`, pageWidth - 14, ty + 4, { align: 'right' });
    ty += 20;

    // Informacoes de pagamento
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACOES PARA PAGAMENTO', 14, ty);
    ty += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Favor efetuar o pagamento ate a data de vencimento.', 14, ty);
    ty += 5;
    doc.text('Em caso de duvidas, entre em contato conosco.', 14, ty);
    ty += 10;

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    const emitido = `Emitido em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`;
    doc.text(emitido, 14, pageHeight - 10);
    doc.text('Mandacaru NR12 ERP', pageWidth - 14, pageHeight - 10, { align: 'right' });

    // Salvar PDF
    const nomeCliente = clienteInfo.nome_razao.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    doc.save(`Fatura_${nomeCliente}_${dataEmissao.replace(/\//g, '-')}.pdf`);
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome_razao.toLowerCase().includes(searchCliente.toLowerCase()) ||
    (c.cnpj_cpf && c.cnpj_cpf.includes(searchCliente))
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/financeiro/contas-receber"
          className="text-sm text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Contas a Receber
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Emitir Fatura</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione um cliente e as contas abertas para gerar a fatura
        </p>
      </div>

      {/* Selecao de Cliente */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Selecione o Cliente</h2>

        <div className="mb-4">
          <input
            type="text"
            value={searchCliente}
            onChange={(e) => setSearchCliente(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ..."
            className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white"
          />
        </div>

        <div className="max-h-60 overflow-y-auto border rounded-lg">
          {clientesFiltrados.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Nenhum cliente encontrado</div>
          ) : (
            <div className="divide-y">
              {clientesFiltrados.slice(0, 50).map((cliente) => (
                <div
                  key={cliente.id}
                  onClick={() => setClienteSelecionado(cliente.id!)}
                  className={`p-3 cursor-pointer transition-colors ${
                    clienteSelecionado === cliente.id
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-900">{cliente.nome_razao}</p>
                  <p className="text-sm text-gray-500">
                    {cliente.cnpj_cpf || 'Sem documento'}
                    {cliente.cidade && ` - ${cliente.cidade}/${cliente.uf}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selecao de Contas */}
      {clienteSelecionado && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">2. Selecione as Contas</h2>
            {contasDisponiveis.length > 0 && (
              <button
                onClick={toggleTodasContas}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {contasSelecionadas.length === contasDisponiveis.length
                  ? 'Desmarcar todas'
                  : 'Selecionar todas'}
              </button>
            )}
          </div>

          {loadingContas ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando contas...</p>
            </div>
          ) : contasDisponiveis.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Este cliente nao possui contas abertas ou vencidas</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={contasSelecionadas.length === contasDisponiveis.length && contasDisponiveis.length > 0}
                        onChange={toggleTodasContas}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contasDisponiveis.map((conta) => {
                    const isSelected = contasSelecionadas.includes(conta.id!);
                    const isVencida = conta.status === 'VENCIDA';
                    return (
                      <tr
                        key={conta.id}
                        onClick={() => toggleConta(conta.id!)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleConta(conta.id!)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {conta.numero || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getOrigemDisplay(conta)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {conta.descricao || '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${isVencida ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {formatDate(conta.data_vencimento)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(Number(conta.valor_final || conta.valor_original || 0))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isVencida ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {conta.status_display || conta.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Resumo e Acoes */}
      {contasSelecionadas.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Resumo da Fatura</h2>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900">{clienteInfo?.nome_razao}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contas Selecionadas</p>
                <p className="font-medium text-gray-900">{contasSelecionadas.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalFatura)}</p>
              </div>
            </div>
          </div>

          {/* Preview das contas */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Contas incluidas na fatura:</h3>
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {contasFatura.map((conta) => (
                <div key={conta.id} className="p-2 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium">{conta.numero}</span>
                    <span className="text-gray-500 ml-2">{getOrigemDisplay(conta)}</span>
                    {conta.descricao && <span className="text-gray-400 ml-2">- {conta.descricao}</span>}
                  </div>
                  <span className="font-medium">{formatCurrency(Number(conta.valor_final || conta.valor_original || 0))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Botoes */}
          <div className="flex gap-4">
            <button
              onClick={handleGerarPDF}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Gerar PDF da Fatura
            </button>
            <button
              onClick={() => {
                setContasSelecionadas([]);
                setClienteSelecionado(null);
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
