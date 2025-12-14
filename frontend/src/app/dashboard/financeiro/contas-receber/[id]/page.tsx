'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { financeiroApi, type ContaReceber } from '@/lib/api';

export default function ContaReceberDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [conta, setConta] = useState<ContaReceber | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPagamentoForm, setShowPagamentoForm] = useState(false);
  const [pagamento, setPagamento] = useState({
    valor_pago: 0,
    forma_pagamento: '',
    comprovante: '',
  });

  useEffect(() => {
    loadConta();
  }, [id]);

  async function loadConta() {
    try {
      setLoading(true);
      const data = await financeiroApi.contasReceber.get(Number(id));
      setConta(data);
      setPagamento({
        valor_pago: data.valor_final || 0,
        forma_pagamento: data.forma_pagamento || '',
        comprovante: data.comprovante || '',
      });
    } catch (error) {
      console.error('Erro ao carregar conta:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReceber() {
    if (!pagamento.forma_pagamento) {
      alert('Informe a forma de pagamento');
      return;
    }

    if (!confirm('Confirmar recebimento desta conta?')) return;

    try {
      await financeiroApi.contasReceber.receber(Number(id), pagamento);
      loadConta();
      setShowPagamentoForm(false);
      alert('Recebimento registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar recebimento:', error);
      alert('Erro ao registrar recebimento');
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
          <p className="text-sm text-gray-600 mt-1">
            {conta.tipo_display}
          </p>
        </div>
        <div className="flex gap-2">
          {(conta.status === 'ABERTA' || conta.status === 'VENCIDA') && (
            <button
              onClick={() => setShowPagamentoForm(!showPagamentoForm)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Registrar Recebimento
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

      {/* Status */}
      <div className="mb-6">
        <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(conta.status)}`}>
          {conta.status_display}
        </span>
      </div>

      {/* Formulário de Pagamento */}
      {showPagamentoForm && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar Recebimento</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Valor Recebido *
              </label>
              <input
                type="number"
                value={pagamento.valor_pago}
                onChange={(e) => setPagamento({ ...pagamento, valor_pago: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Forma de Pagamento *
              </label>
              <select
                value={pagamento.forma_pagamento}
                onChange={(e) => setPagamento({ ...pagamento, forma_pagamento: e.target.value })}
                className="w-full px-3 py-2 border rounded text-black bg-white"
              >
                <option value="" className="text-black bg-white">Selecione...</option>
                <option value="DINHEIRO" className="text-black bg-white">Dinheiro</option>
                <option value="PIX" className="text-black bg-white">PIX</option>
                <option value="CARTAO_CREDITO" className="text-black bg-white">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO" className="text-black bg-white">Cartão de Débito</option>
                <option value="BOLETO" className="text-black bg-white">Boleto</option>
                <option value="TRANSFERENCIA" className="text-black bg-white">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Comprovante
              </label>
              <input
                type="text"
                value={pagamento.comprovante}
                onChange={(e) => setPagamento({ ...pagamento, comprovante: e.target.value })}
                placeholder="Número do comprovante"
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReceber}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Confirmar Recebimento
            </button>
            <button
              onClick={() => setShowPagamentoForm(false)}
              className="bg-gray-300 text-gray-900 px-6 py-2 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Informações Principais */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da Conta</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="text-gray-900 font-medium">{conta.cliente_nome}</p>
              {conta.cliente_cpf_cnpj && (
                <p className="text-sm text-gray-600">{conta.cliente_cpf_cnpj}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Origem</p>
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
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="text-gray-900">{conta.descricao}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datas</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Data de Emissão</p>
              <p className="text-gray-900 font-medium">
                {new Date(conta.data_emissao!).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data de Vencimento</p>
              <p className="text-gray-900 font-medium">
                {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {conta.data_pagamento && (
              <div>
                <p className="text-sm text-gray-600">Data de Pagamento</p>
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
              <p className="text-sm text-gray-600">Forma de Pagamento</p>
              <p className="text-gray-900 font-medium">{conta.forma_pagamento}</p>
            </div>
            {conta.comprovante && (
              <div>
                <p className="text-sm text-gray-600">Comprovante</p>
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
            <p className="text-sm text-gray-600">Criado por</p>
            <p className="text-gray-900">{conta.criado_por_nome || '-'}</p>
          </div>
          {conta.recebido_por_nome && (
            <div>
              <p className="text-sm text-gray-600">Recebido por</p>
              <p className="text-gray-900">{conta.recebido_por_nome}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
