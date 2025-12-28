'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orcamentosApi, cadastroApi, empreendimentosApi, equipamentosApi, almoxarifadoApi } from '@/lib/api';
import type { Cliente, Empreendimento, Equipamento, ItemOrcamento, Produto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [formData, setFormData] = useState({
    tipo: 'MANUTENCAO_CORRETIVA' as const,
    status: 'RASCUNHO' as const,
    cliente: undefined as number | undefined,
    empreendimento: undefined as number | undefined,
    equipamento: undefined as number | undefined,
    data_validade: '',
    km_deslocado: 0,
    valor_km: 0,
    valor_desconto: 0,
    descricao: '',
    observacoes: '',
    prazo_execucao_dias: 7,
  });

  const [itens, setItens] = useState<Partial<ItemOrcamento>[]>([]);
  const [novoItem, setNovoItem] = useState({
    tipo: 'SERVICO' as const,
    produto: undefined as number | undefined,
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    observacao: '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (formData.cliente) {
      loadEmpreendimentos(formData.cliente);
    }
  }, [formData.cliente]);

  useEffect(() => {
    if (formData.empreendimento) {
      loadEquipamentos(formData.empreendimento);
    }
  }, [formData.empreendimento]);

  async function loadOptions() {
    try {
      const [clientsData, prodsData] = await Promise.all([
        cadastroApi.clientes.list(),
        almoxarifadoApi.produtos.list(),
      ]);
      setClientes(clientsData.results || []);
      setProdutos(prodsData.results || []);
    } catch (error) {
      console.error('Erro ao carregar opções:', error);
    }
  }

  async function loadEmpreendimentos(clienteId: number) {
    try {
      const data = await empreendimentosApi.list({ cliente: clienteId });
      setEmpreendimentos(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
    }
  }

  async function loadEquipamentos(empreendimentoId: number) {
    try {
      const data = await equipamentosApi.list({ empreendimento: empreendimentoId });
      setEquipamentos(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  }

  function adicionarItem() {
    if (!novoItem.descricao || novoItem.quantidade <= 0 || novoItem.valor_unitario <= 0) {
      alert('Preencha todos os campos do item');
      return;
    }

    const itemToAdd = {
      ...novoItem,
      produto: novoItem.produto || null,
    } as any;

    setItens([...itens, itemToAdd]);
    setNovoItem({
      tipo: 'SERVICO',
      produto: undefined,
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      observacao: '',
    });
  }

  function removerItem(index: number) {
    setItens(itens.filter((_, i) => i !== index));
  }

  function calcularValorDeslocamento() {
    return formData.km_deslocado * formData.valor_km;
  }

  function calcularTotal() {
    const valorItens = itens.reduce((sum, item) => {
      return sum + (item.quantidade || 0) * (item.valor_unitario || 0);
    }, 0);
    const valorDeslocamento = calcularValorDeslocamento();
    return valorItens + valorDeslocamento - formData.valor_desconto;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.cliente) {
      alert('Selecione um cliente');
      return;
    }

    if (!formData.data_validade) {
      alert('Informe a data de validade');
      return;
    }

    if (itens.length === 0) {
      alert('Adicione pelo menos um item ao orçamento');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        empreendimento: formData.empreendimento || null,
        equipamento: formData.equipamento || null,
        valor_deslocamento: calcularValorDeslocamento(),
        itens: itens as ItemOrcamento[],
      };
      console.log('Payload enviado:', JSON.stringify(payload, null, 2));
      await orcamentosApi.create(payload as any);
      toast.success('Orçamento criado com sucesso');
      // Força reload completo da página para garantir que a listagem seja atualizada
      window.location.href = '/dashboard/orcamentos';
    } catch (error: any) {
      console.error('Erro ao criar orçamento:', error);
      console.error('Mensagem de erro:', error.message);
      const errorMsg = error.message || 'Erro desconhecido';
      toast.error(`Erro ao criar orçamento: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Orçamento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo e Cliente */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Tipo de Orçamento *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-3 py-2 border rounded text-black bg-white"
                required
              >
                <option value="MANUTENCAO_CORRETIVA" className="text-black bg-white">Manutenção Corretiva</option>
                <option value="MANUTENCAO_PREVENTIVA" className="text-black bg-white">Manutenção Preventiva</option>
                <option value="PRODUTO" className="text-black bg-white">Produto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Cliente *
              </label>
              <select
                value={formData.cliente || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  cliente: e.target.value ? Number(e.target.value) : undefined,
                  empreendimento: undefined,
                  equipamento: undefined,
                })}
                className="w-full px-3 py-2 border rounded text-black bg-white"
                required
              >
                <option value="" className="text-black bg-white">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id} className="text-black bg-white">
                    {c.nome_razao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Empreendimento
              </label>
              <select
                value={formData.empreendimento || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  empreendimento: e.target.value ? Number(e.target.value) : undefined,
                  equipamento: undefined,
                })}
                className="w-full px-3 py-2 border rounded text-black bg-white"
                disabled={!formData.cliente}
              >
                <option value="" className="text-black bg-white">Selecione...</option>
                {empreendimentos.map((e) => (
                  <option key={e.id} value={e.id} className="text-black bg-white">
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Equipamento
              </label>
              <select
                value={formData.equipamento || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  equipamento: e.target.value ? Number(e.target.value) : undefined,
                })}
                className="w-full px-3 py-2 border rounded text-black bg-white"
                disabled={!formData.empreendimento}
              >
                <option value="" className="text-black bg-white">Selecione...</option>
                {equipamentos.map((eq) => (
                  <option key={eq.id} value={eq.id} className="text-black bg-white">
                    {eq.codigo} - {eq.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Data de Validade *
              </label>
              <input
                type="date"
                value={formData.data_validade}
                onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Prazo de Execução (dias)
              </label>
              <input
                type="number"
                value={formData.prazo_execucao_dias}
                onChange={(e) => setFormData({ ...formData, prazo_execucao_dias: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                min="1"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Itens do Orçamento</h2>

          {/* Adicionar Item */}
          <div className="border-b pb-4 mb-4">
            <div className="grid grid-cols-6 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Tipo</label>
                <select
                  value={novoItem.tipo}
                  onChange={(e) => setNovoItem({ ...novoItem, tipo: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded text-black bg-white"
                >
                  <option value="SERVICO" className="text-black bg-white">Serviço</option>
                  <option value="PRODUTO" className="text-black bg-white">Produto</option>
                </select>
              </div>

              {(novoItem as any).tipo === 'PRODUTO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Produto</label>
                  <select
                    value={novoItem.produto || ''}
                    onChange={(e) => {
                      const prodId = Number(e.target.value);
                      const prod = produtos.find(p => p.id === prodId);
                      setNovoItem({
                        ...novoItem,
                        produto: prodId,
                        descricao: prod?.nome || '',
                        valor_unitario: (prod as any)?.preco_venda || 0,
                      });
                    }}
                    className="w-full px-3 py-2 border rounded text-black bg-white"
                  >
                    <option value="" className="text-black bg-white">Selecione...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id} className="text-black bg-white">
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={(novoItem as any).tipo === 'PRODUTO' ? 'col-span-2' : 'col-span-3'}>
                <label className="block text-sm font-medium text-gray-900 mb-1">Descrição</label>
                <input
                  type="text"
                  value={novoItem.descricao}
                  onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Qtd</label>
                <input
                  type="number"
                  value={novoItem.quantidade}
                  onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Valor Unit.</label>
                <input
                  type="number"
                  value={novoItem.valor_unitario}
                  onChange={(e) => setNovoItem({ ...novoItem, valor_unitario: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Itens */}
          {itens.length > 0 && (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-900">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-900">Descrição</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-900">Qtd</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-900">Valor Unit.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-900">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itens.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.tipo === 'SERVICO' ? 'Serviço' : 'Produto'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.descricao}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.quantidade}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      R$ {item.valor_unitario?.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      R$ {((item.quantidade || 0) * (item.valor_unitario || 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => removerItem(idx)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Valores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Valores</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                KM Deslocado
              </label>
              <input
                type="number"
                value={formData.km_deslocado}
                onChange={(e) => setFormData({ ...formData, km_deslocado: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Valor do KM Rodado (R$)
              </label>
              <input
                type="number"
                value={formData.valor_km}
                onChange={(e) => setFormData({ ...formData, valor_km: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Valor do Deslocamento
              </label>
              <input
                type="number"
                value={calcularValorDeslocamento()}
                disabled
                className="w-full px-3 py-2 border rounded text-gray-900 bg-gray-100 cursor-not-allowed"
              />
              <span className="text-xs text-gray-900">Calculado automaticamente</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Valor Desconto
              </label>
              <input
                type="number"
                value={formData.valor_desconto}
                onChange={(e) => setFormData({ ...formData, valor_desconto: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded">
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>VALOR TOTAL:</span>
              <span>R$ {calcularTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Salvando...' : 'Salvar Orçamento'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-900 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
