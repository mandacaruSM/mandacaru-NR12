'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { financeiroApi, type ContaPagar } from '@/lib/api';

export default function ContaPagarDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [conta, setConta] = useState<ContaPagar | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [formData, setFormData] = useState({
    valor_pago: 0,
    forma_pagamento: 'DINHEIRO',
    comprovante: '',
  });

  useEffect(() => {
    loadConta();
  }, [id]);

  async function loadConta() {
    try {
      setLoading(true);
      const contaData = await financeiroApi.contasPagar.get(Number(id));
      setConta(contaData);
      setFormData({
        ...formData,
        valor_pago: Number(contaData.valor_final || 0),
      });
    } catch (error) {
      console.error('Erro ao carregar conta:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePagar() {
    if (!conta) return;

    try {
      await financeiroApi.contasPagar.pagar(conta.id!, formData);
      alert('Pagamento registrado com sucesso!');
      setShowPagamentoModal(false);
      loadConta();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento');
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
            Conta a Pagar {conta.numero}
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
      {showPagamentoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar Pagamento</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Valor a Pagar
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_pago}
                  onChange={(e) => setFormData({ ...formData, valor_pago: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={formData.forma_pagamento}
                  onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-black bg-white"
                >
                  <option value="DINHEIRO" className="text-black bg-white">Dinheiro</option>
                  <option value="PIX" className="text-black bg-white">PIX</option>
                  <option value="CHEQUE" className="text-black bg-white">Cheque</option>
                  <option value="BOLETO" className="text-black bg-white">Boleto</option>
                  <option value="DEPOSITO" className="text-black bg-white">Depósito</option>
                  <option value="TRANSFERENCIA" className="text-black bg-white">Transferência</option>
                  <option value="CARTAO_CREDITO" className="text-black bg-white">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO" className="text-black bg-white">Cartão de Débito</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Comprovante
                </label>
                <input
                  type="text"
                  value={formData.comprovante}
                  onChange={(e) => setFormData({ ...formData, comprovante: e.target.value })}
                  placeholder="Número do comprovante, nota fiscal, etc."
                  className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPagamentoModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handlePagar}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mb-6">
        <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(conta.status)}`}>
          {conta.status_display}
        </span>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da Conta</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-900">Fornecedor</p>
              <p className="text-gray-900 font-medium">{conta.fornecedor}</p>
            </div>
            {conta.numero_documento && (
              <div>
                <p className="text-sm text-gray-900">Número do Documento</p>
                <p className="text-gray-900 font-medium">{conta.numero_documento}</p>
              </div>
            )}
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
          {conta.pago_por_nome && (
            <div>
              <p className="text-sm text-gray-900">Pago por</p>
              <p className="text-gray-900">{conta.pago_por_nome}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
