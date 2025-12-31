'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { financeiroApi, type ContaReceber, type Pagamento } from '@/lib/api';
import PagamentoModal from '@/components/PagamentoModal';

export default function ContaReceberDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [conta, setConta] = useState<ContaReceber | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);

  useEffect(() => {
    loadConta();
  }, [id]);

  async function loadConta() {
    try {
      setLoading(true);
      const [contaData, pagamentosData] = await Promise.all([
        financeiroApi.contasReceber.get(Number(id)),
        financeiroApi.pagamentos.porConta(Number(id))
      ]);
      setConta(contaData);
      setPagamentos(pagamentosData.pagamentos || []);
    } catch (error) {
      console.error('Erro ao carregar conta:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePagamentoSuccess() {
    loadConta();
  }

  async function handleConfirmarParcela(pagamento: Pagamento) {
    const parcelaInfo = pagamento.numero_parcela
      ? `parcela ${pagamento.numero_parcela}/${pagamento.total_parcelas}`
      : 'pagamento';

    if (!confirm(`Deseja confirmar o ${parcelaInfo} no valor de R$ ${Number(pagamento.valor_final || 0).toFixed(2)}?`)) {
      return;
    }

    try {
      await financeiroApi.pagamentos.confirmar(pagamento.id!);
      alert('Pagamento confirmado com sucesso!');
      loadConta();
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      alert('Erro ao confirmar pagamento');
    }
  }

  async function handleCancelarParcela(pagamento: Pagamento) {
    const parcelaInfo = pagamento.numero_parcela
      ? `parcela ${pagamento.numero_parcela}/${pagamento.total_parcelas}`
      : 'pagamento';

    if (!confirm(`Deseja cancelar o ${parcelaInfo}?`)) {
      return;
    }

    try {
      await financeiroApi.pagamentos.cancelar(pagamento.id!);
      alert('Pagamento cancelado com sucesso!');
      loadConta();
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      alert('Erro ao cancelar pagamento');
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

  if (loading) {
    return <div className="p-6 text-gray-900">Carregando...</div>;
  }

  if (!conta) {
    return <div className="p-6 text-gray-900">Conta não encontrada</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Conta a Receber {conta.numero}
          </h1>
          <p className="text-sm text-gray-900 mt-1">
            {conta.tipo_display}
          </p>
        </div>
        <div className="flex gap-2">
          {(conta.status === 'ABERTA' || conta.status === 'VENCIDA') && (
            <button
              onClick={() => setShowPagamentoModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Registrar Pagamento
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400"
          >
            Voltar
          </button>
        </div>
      </div>

      {/* Modal de Pagamento */}
      <PagamentoModal
        conta={conta}
        isOpen={showPagamentoModal}
        onClose={() => setShowPagamentoModal(false)}
        onSuccess={handlePagamentoSuccess}
      />

      {/* Status */}
      <div className="mb-6">
        <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(conta.status)}`}>
          {conta.status_display}
        </span>
      </div>

      {/* Lista de Pagamentos */}
      {pagamentos.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Pagamentos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desconto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagamentos.map((pag) => (
                  <tr key={pag.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{pag.numero}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(pag.data_pagamento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {pag.tipo_pagamento_display}
                      {pag.numero_parcela && ` (${pag.numero_parcela}/${pag.total_parcelas})`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pag.forma_pagamento_display}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      R$ {pag.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {pag.valor_desconto > 0 ? `R$ ${pag.valor_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      R$ {(pag.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        pag.status === 'CONFIRMADO' ? 'bg-green-100 text-green-800' :
                        pag.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pag.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center gap-2">
                        {pag.status === 'PENDENTE' && (
                          <button
                            onClick={() => handleConfirmarParcela(pag)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                            title="Confirmar pagamento"
                          >
                            ✓ Baixar
                          </button>
                        )}
                        {pag.status === 'PENDENTE' && (
                          <button
                            onClick={() => handleCancelarParcela(pag)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                            title="Cancelar pagamento"
                          >
                            ✕ Cancelar
                          </button>
                        )}
                        {pag.status === 'CONFIRMADO' && (
                          <span className="text-xs text-gray-500">Confirmado</span>
                        )}
                        {pag.status === 'CANCELADO' && (
                          <span className="text-xs text-gray-500">Cancelado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Informações Principais */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da Conta</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-900">Cliente</p>
              <p className="text-gray-900 font-medium">{conta.cliente_nome}</p>
              {conta.cliente_cpf_cnpj && (
                <p className="text-sm text-gray-900">{conta.cliente_cpf_cnpj}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-900">Origem</p>
              {conta.orcamento_numero && (
                <p className="text-gray-900 font-medium">Orçamento {conta.orcamento_numero}</p>
              )}
              {conta.ordem_servico_numero && (
                <p className="text-gray-900 font-medium">OS {conta.ordem_servico_numero}</p>
              )}
              {!conta.orcamento_numero && !conta.ordem_servico_numero && (
                <p className="text-gray-900 font-medium">Venda Direta</p>
              )}
            </div>
            {conta.descricao && (
              <div>
                <p className="text-sm text-gray-900">Descrição</p>
                <p className="text-gray-900">{conta.descricao}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datas</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-900">Data de Emissão</p>
              <p className="text-gray-900 font-medium">
                {new Date(conta.data_emissao!).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-900">Data de Vencimento</p>
              <p className="text-gray-900 font-medium">
                {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {conta.data_pagamento && (
              <div>
                <p className="text-sm text-gray-900">Data de Pagamento</p>
                <p className="text-gray-900 font-medium">
                  {new Date(conta.data_pagamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Valores */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Valores</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-900">
            <span>Valor Original:</span>
            <span>R$ {Number(conta.valor_original || 0).toFixed(2)}</span>
          </div>
          {conta.valor_juros > 0 && (
            <div className="flex justify-between text-gray-900">
              <span>Juros:</span>
              <span>+ R$ {Number(conta.valor_juros || 0).toFixed(2)}</span>
            </div>
          )}
          {conta.valor_desconto > 0 && (
            <div className="flex justify-between text-gray-900">
              <span>Desconto:</span>
              <span>- R$ {Number(conta.valor_desconto || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
            <span>TOTAL:</span>
            <span>R$ {Number(conta.valor_final || 0).toFixed(2)}</span>
          </div>
          {conta.valor_pago > 0 && (
            <>
              <div className="flex justify-between text-green-900 font-medium pt-2 border-t">
                <span>Valor Pago:</span>
                <span>R$ {Number(conta.valor_pago || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-900">
                <span>Saldo:</span>
                <span>R$ {Number((conta.valor_final || 0) - conta.valor_pago).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Informações de Pagamento */}
      {conta.forma_pagamento && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações de Pagamento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-900">Forma de Pagamento</p>
              <p className="text-gray-900 font-medium">{conta.forma_pagamento}</p>
            </div>
            {conta.comprovante && (
              <div>
                <p className="text-sm text-gray-900">Comprovante</p>
                <p className="text-gray-900 font-medium">{conta.comprovante}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Observações */}
      {conta.observacoes && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Observações</h2>
          <p className="text-gray-900">{conta.observacoes}</p>
        </div>
      )}

      {/* Informações de Controle */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações de Controle</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-900">Criado por</p>
            <p className="text-gray-900">{conta.criado_por_nome || '-'}</p>
          </div>
          {conta.recebido_por_nome && (
            <div>
              <p className="text-sm text-gray-900">Recebido por</p>
              <p className="text-gray-900">{conta.recebido_por_nome}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
