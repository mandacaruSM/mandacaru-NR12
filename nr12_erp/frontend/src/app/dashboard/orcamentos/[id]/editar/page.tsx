'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { orcamentosApi, cadastroApi, empreendimentosApi, equipamentosApi, almoxarifadoApi } from '@/lib/api';
import type { Cliente, Empreendimento, Equipamento, ItemOrcamento, Produto, Orcamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function EditarOrcamentoPage() {
  const router = useRouter();
  const params = useParams();
  const orcamentoId = Number(params.id);
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [bloqueado, setBloqueado] = useState(false);

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
    horimetro: undefined as number | undefined,
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
    loadOrcamento();
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

  async function loadOrcamento() {
    try {
      setLoadingData(true);
      const data = await orcamentosApi.get(orcamentoId);
      setOrcamento(data);

      // Verificar se está aprovado
      if (data.status === 'APROVADO') {
        setBloqueado(true);
        toast.warning('Este orçamento está aprovado e não pode ser editado');
      }

      // Preencher formulário
      setFormData({
        tipo: data.tipo,
        status: data.status,
        cliente: data.cliente,
        empreendimento: data.empreendimento || undefined,
        equipamento: data.equipamento || undefined,
        data_validade: data.data_validade || '',
        km_deslocado: Number(data.km_deslocado || 0),
        valor_km: Number(data.valor_km || 0),
        valor_desconto: Number(data.valor_desconto || 0),
        descricao: data.descricao || '',
        observacoes: data.observacoes || '',
        prazo_execucao_dias: data.prazo_execucao_dias || 7,
        horimetro: (data as any).horimetro ? Number((data as any).horimetro) : undefined,
      });

      setItens(data.itens || []);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      toast.error('Erro ao carregar orçamento');
      router.push('/dashboard/orcamentos');
    } finally {
      setLoadingData(false);
    }
  }

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

    if (bloqueado) {
      toast.error('Orçamento aprovado não pode ser editado');
      return;
    }

    if (!formData.cliente) {
      alert('Selecione um cliente');
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

      await orcamentosApi.update(orcamentoId, payload as any);
      toast.success('Orçamento atualizado com sucesso');
      router.push('/dashboard/orcamentos');
    } catch (error: any) {
      console.error('Erro ao atualizar orçamento:', error);
      const errorMsg = error.message || 'Erro desconhecido';
      toast.error(`Erro ao atualizar orçamento: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Editar Orçamento {orcamento?.numero}
        </h1>
        {bloqueado && (
          <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Este orçamento está aprovado e não pode ser editado.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
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
                disabled={bloqueado}
              >
                <option value="MANUTENCAO_CORRETIVA">Manutenção Corretiva</option>
                <option value="MANUTENCAO_PREVENTIVA">Manutenção Preventiva</option>
                <option value="PRODUTO">Produto</option>
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
                disabled={bloqueado}
              >
                <option value="">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
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
                disabled={!formData.cliente || bloqueado}
              >
                <option value="">Selecione...</option>
                {empreendimentos.map((e) => (
                  <option key={e.id} value={e.id}>
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
                disabled={!formData.empreendimento || bloqueado}
              >
                <option value="">Selecione...</option>
                {equipamentos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.codigo} - {eq.descricao}
                  </option>
                ))}
              </select>
            </div>

            {formData.equipamento && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Horímetro/Odômetro
                </label>
                <input
                  type="number"
                  value={formData.horimetro || ''}
                  onChange={(e) => setFormData({ ...formData, horimetro: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                  step="0.01"
                  placeholder="Leitura atual do equipamento"
                  disabled={bloqueado}
                />
              </div>
            )}

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
                disabled={bloqueado}
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
                disabled={bloqueado}
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
              disabled={bloqueado}
            />
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Itens do Orçamento</h2>

          {/* Adicionar Item */}
          {!bloqueado && (
            <div className="border-b pb-4 mb-4">
              <div className="grid grid-cols-6 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Tipo</label>
                  <select
                    value={novoItem.tipo}
                    onChange={(e) => setNovoItem({ ...novoItem, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded text-black bg-white"
                  >
                    <option value="SERVICO">Serviço</option>
                    <option value="PRODUTO">Produto</option>
                  </select>
                </div>

                {novoItem.tipo === 'PRODUTO' && (
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
                      <option value="">Selecione...</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={novoItem.tipo === 'PRODUTO' ? 'col-span-2' : 'col-span-3'}>
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
          )}

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
                  {!bloqueado && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-900">Ações</th>
                  )}
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
                    {!bloqueado && (
                      <td className="px-4 py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => removerItem(idx)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remover
                        </button>
                      </td>
                    )}
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
                disabled={bloqueado}
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
                disabled={bloqueado}
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
                disabled={bloqueado}
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
            disabled={bloqueado}
          />
        </div>

        {/* Botões */}
        <div className="flex gap-4">
          {!bloqueado && (
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-900 px-6 py-2 rounded hover:bg-gray-400"
          >
            {bloqueado ? 'Voltar' : 'Cancelar'}
          </button>
        </div>
      </form>
    </div>
  );
}
