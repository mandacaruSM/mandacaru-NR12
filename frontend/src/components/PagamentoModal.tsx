// frontend/src/components/PagamentoModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { financeiroApi, type Pagamento, type ContaReceber } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface PagamentoModalProps {
  conta: ContaReceber;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PagamentoModal({ conta, isOpen, onClose, onSuccess }: PagamentoModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState<'TOTAL' | 'PARCIAL' | 'PARCELADO'>('TOTAL');

  const saldoDevedor = (conta.valor_final || 0) - conta.valor_pago;

  const [formData, setFormData] = useState({
    valor: saldoDevedor,
    valor_desconto: 0,
    forma_pagamento: 'PIX' as const,
    data_pagamento: new Date().toISOString().split('T')[0],
    numero_cheque: '',
    banco_cheque: '',
    data_compensacao: '',
    numero_documento: '',
    comprovante: '',
    observacoes: '',
  });

  const [parcelamento, setParcelamento] = useState({
    numero_parcelas: 2,
    dias_entre_parcelas: 30,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, valor: saldoDevedor }));
    }
  }, [isOpen, saldoDevedor]);

  const valorFinal = formData.valor - formData.valor_desconto;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Arredondar valores para 2 casas decimais para evitar erros de precisão
      const valorArredondado = Math.round(formData.valor * 100) / 100;
      const descontoArredondado = Math.round(formData.valor_desconto * 100) / 100;

      if (tipoPagamento === 'PARCELADO') {
        // Criar pagamentos parcelados
        await financeiroApi.pagamentos.parcelar({
          conta_receber: conta.id!,
          valor_total: valorArredondado,
          valor_desconto: descontoArredondado,
          forma_pagamento: formData.forma_pagamento,
          numero_parcelas: parcelamento.numero_parcelas,
          data_primeiro_pagamento: formData.data_pagamento,
          dias_entre_parcelas: parcelamento.dias_entre_parcelas,
          observacoes: formData.observacoes,
        });
        toast.success(`${parcelamento.numero_parcelas} parcelas criadas com sucesso!`);
      } else {
        // Criar pagamento único
        await financeiroApi.pagamentos.create({
          conta_receber: conta.id!,
          tipo_pagamento: tipoPagamento === 'TOTAL' ? 'TOTAL' : 'PARCIAL',
          forma_pagamento: formData.forma_pagamento,
          status: 'CONFIRMADO',
          valor: valorArredondado,
          valor_desconto: descontoArredondado,
          data_pagamento: formData.data_pagamento,
          numero_cheque: formData.numero_cheque || undefined,
          banco_cheque: formData.banco_cheque || undefined,
          data_compensacao: formData.data_compensacao || undefined,
          numero_documento: formData.numero_documento || undefined,
          comprovante: formData.comprovante || undefined,
          observacoes: formData.observacoes || undefined,
        });
        toast.success('Pagamento registrado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao registrar pagamento:', err);
      toast.error(err.message || 'Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Registrar Pagamento</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Conta: {conta.numero} - {conta.cliente_nome}
            </p>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Resumo da Conta */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Valor Total:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    R$ {(conta.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Já Pago:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    R$ {conta.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Saldo Devedor:</span>
                  <span className="ml-2 font-bold text-blue-600 text-lg">
                    R$ {saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Tipo de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pagamento
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoPagamento('TOTAL');
                    setFormData(prev => ({ ...prev, valor: saldoDevedor }));
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    tipoPagamento === 'TOTAL'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  Total
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPagamento('PARCIAL')}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    tipoPagamento === 'PARCIAL'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  Parcial
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPagamento('PARCELADO')}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    tipoPagamento === 'PARCELADO'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  Parcelado
                </button>
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor {tipoPagamento === 'PARCELADO' ? 'Total' : 'do Pagamento'} *
                </label>
                <input
                  type="number"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                  required
                  min="0"
                  max={saldoDevedor}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desconto
                </label>
                <input
                  type="number"
                  value={formData.valor_desconto}
                  onChange={(e) => setFormData({ ...formData, valor_desconto: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                />
              </div>
            </div>

            {valorFinal > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="text-sm text-gray-600">Valor Final:</span>
                <span className="ml-2 font-bold text-green-700 text-lg">
                  R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Parcelamento */}
            {tipoPagamento === 'PARCELADO' && (
              <div className="grid grid-cols-2 gap-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Parcelas *
                  </label>
                  <input
                    type="number"
                    value={parcelamento.numero_parcelas}
                    onChange={(e) => setParcelamento({ ...parcelamento, numero_parcelas: Number(e.target.value) })}
                    required
                    min="2"
                    max="24"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dias entre parcelas
                  </label>
                  <input
                    type="number"
                    value={parcelamento.dias_entre_parcelas}
                    onChange={(e) => setParcelamento({ ...parcelamento, dias_entre_parcelas: Number(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                  />
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  Cada parcela: R$ {(valorFinal / parcelamento.numero_parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento *
              </label>
              <select
                value={formData.forma_pagamento}
                onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value as any })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
              >
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="DEPOSITO">Depósito Bancário</option>
                <option value="TRANSFERENCIA">Transferência Bancária</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
              </select>
            </div>

            {/* Data do Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data do {tipoPagamento === 'PARCELADO' ? 'Primeiro ' : ''}Pagamento *
              </label>
              <input
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
              />
            </div>

            {/* Campos específicos para Cheque */}
            {formData.forma_pagamento === 'CHEQUE' && (
              <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cheque
                  </label>
                  <input
                    type="text"
                    value={formData.numero_cheque}
                    onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={formData.banco_cheque}
                    onChange={(e) => setFormData({ ...formData, banco_cheque: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Compensação
                  </label>
                  <input
                    type="date"
                    value={formData.data_compensacao}
                    onChange={(e) => setFormData({ ...formData, data_compensacao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                  />
                </div>
              </div>
            )}

            {/* Campos específicos para Boleto/Depósito */}
            {(['BOLETO', 'DEPOSITO', 'TRANSFERENCIA'].includes(formData.forma_pagamento)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Documento
                </label>
                <input
                  type="text"
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                  placeholder="Número do boleto, comprovante ou NSU"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                />
              </div>
            )}

            {/* Comprovante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprovante
              </label>
              <input
                type="text"
                value={formData.comprovante}
                onChange={(e) => setFormData({ ...formData, comprovante: e.target.value })}
                placeholder="Número ou referência do comprovante"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 !text-gray-900"
                placeholder="Informações adicionais sobre o pagamento..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
