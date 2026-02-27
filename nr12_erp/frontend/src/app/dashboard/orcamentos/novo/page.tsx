'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orcamentosApi, cadastroApi, empreendimentosApi, equipamentosApi, almoxarifadoApi, itensManutencaoApi } from '@/lib/api';
import { getModelosManutencaoPreventiva } from '@/services/manutencao-preventiva-service';
import type { Cliente, Empreendimento, Equipamento, ItemOrcamento, Produto, ItemManutencao } from '@/lib/api';
import type { ModeloManutencaoPreventiva } from '@/types/manutencao-preventiva';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modelosManutencao, setModelosManutencao] = useState<ModeloManutencaoPreventiva[]>([]);
  const [itensManutencao, setItensManutencao] = useState<ItemManutencao[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);
  const [searchProduto, setSearchProduto] = useState('');

  const [formData, setFormData] = useState({
    tipo: 'MANUTENCAO_CORRETIVA' as const,
    status: 'RASCUNHO' as const,
    cliente: undefined as number | undefined,
    empreendimento: undefined as number | undefined,
    equipamento: undefined as number | undefined,
    modelo_manutencao_preventiva: undefined as number | undefined,
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

  // Carregar modelos de manutenção preventiva quando equipamento for selecionado
  useEffect(() => {
    if (formData.equipamento && formData.tipo === 'MANUTENCAO_PREVENTIVA') {
      loadModelosManutencao();
    }
  }, [formData.equipamento, formData.tipo]);

  // Carregar itens de manutenção quando equipamento for selecionado
  useEffect(() => {
    if (formData.equipamento) {
      loadItensManutencao(formData.equipamento);
    } else {
      setItensManutencao([]);
      setItensSelecionados([]);
    }
  }, [formData.equipamento]);

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

  async function loadModelosManutencao() {
    try {
      // Buscar equipamento selecionado para pegar o tipo
      const equipamento = equipamentos.find(e => e.id === formData.equipamento);
      if (equipamento) {
        const data = await getModelosManutencaoPreventiva({
          tipo_equipamento: equipamento.tipo,
          ativo: true,
          page_size: 100,
        });
        setModelosManutencao(data.results || []);
      }
    } catch (error) {
      console.error('Erro ao carregar modelos de manutenção:', error);
    }
  }

  async function loadItensManutencao(equipamentoId: number) {
    try {
      const data = await itensManutencaoApi.list({ equipamento: equipamentoId });
      setItensManutencao(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar itens de manutenção:', error);
    }
  }

  function toggleItemManutencao(itemId: number) {
    setItensSelecionados(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }

  // Filtrar produtos baseado na busca
  const produtosFiltrados = produtos.filter(p => {
    const searchLower = searchProduto.toLowerCase();
    return (
      p.nome.toLowerCase().includes(searchLower) ||
      (p.codigo && p.codigo.toLowerCase().includes(searchLower))
    );
  });

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

    // Adicionar valor dos itens de manutenção selecionados
    const valorItensManutencao = itensSelecionados.reduce((sum, itemId) => {
      const itemManutencao = itensManutencao.find(i => i.id === itemId);
      if (itemManutencao) {
        const produto = produtos.find(p => p.id === itemManutencao.produto);
        const precoVenda = (produto as any)?.preco_venda || 0;
        return sum + (itemManutencao.quantidade_necessaria * precoVenda);
      }
      return sum;
    }, 0);

    const valorDeslocamento = calcularValorDeslocamento();
    return valorItens + valorItensManutencao + valorDeslocamento - formData.valor_desconto;
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

      // Adicionar itens de manutenção selecionados aos itens do orçamento
      const itensFinais = [...itens];

      // Para cada item de manutenção selecionado, adicionar como produto no orçamento
      for (const itemId of itensSelecionados) {
        const itemManutencao = itensManutencao.find(i => i.id === itemId);
        if (itemManutencao) {
          // Buscar o produto para pegar o preço de venda
          const produto = produtos.find(p => p.id === itemManutencao.produto);
          const precoVenda = (produto as any)?.preco_venda || 0;

          itensFinais.push({
            tipo: 'PRODUTO',
            produto: itemManutencao.produto,
            descricao: itemManutencao.produto_nome || '',
            quantidade: itemManutencao.quantidade_necessaria,
            valor_unitario: precoVenda,
            observacao: `Item de manutenção: ${itemManutencao.categoria}`,
          });
        }
      }

      const payload = {
        ...formData,
        empreendimento: formData.empreendimento || null,
        equipamento: formData.equipamento || null,
        valor_deslocamento: calcularValorDeslocamento(),
        itens: itensFinais as ItemOrcamento[],
        itens_manutencao: itensSelecionados.length > 0 ? itensSelecionados : undefined,
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
                  modelo_manutencao_preventiva: undefined,
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
                />
              </div>
            )}

            {/* Modelo de Manutenção Preventiva - aparece apenas quando tipo = MANUTENCAO_PREVENTIVA */}
            {formData.tipo === 'MANUTENCAO_PREVENTIVA' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Modelo de Manutenção Preventiva *
                </label>
                <select
                  value={formData.modelo_manutencao_preventiva || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    modelo_manutencao_preventiva: e.target.value ? Number(e.target.value) : undefined,
                  })}
                  className="w-full px-3 py-2 border rounded text-black bg-white"
                  disabled={!formData.equipamento}
                  required={formData.tipo === 'MANUTENCAO_PREVENTIVA'}
                >
                  <option value="" className="text-black bg-white">
                    {!formData.equipamento ? 'Selecione primeiro o equipamento' : 'Selecione o modelo...'}
                  </option>
                  {modelosManutencao.map((modelo) => (
                    <option key={modelo.id} value={modelo.id} className="text-black bg-white">
                      {modelo.nome} (a cada {modelo.intervalo} {modelo.tipo_medicao === 'HORIMETRO' ? 'h' : 'km'})
                    </option>
                  ))}
                </select>
                {formData.equipamento && modelosManutencao.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Nenhum modelo de manutenção preventiva cadastrado para este tipo de equipamento.
                  </p>
                )}
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

        {/* Itens de Manutenção */}
        {formData.equipamento && itensManutencao.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Itens de Manutenção do Equipamento</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Selecione os itens que serão incluídos neste orçamento ({itensSelecionados.length} selecionados)
                </p>
              </div>
              <Link
                href={`/dashboard/equipamentos/${formData.equipamento}/manutencao`}
                target="_blank"
                className="text-blue-600 hover:underline text-sm"
              >
                Gerenciar itens do equipamento
              </Link>
            </div>

            <div className="space-y-2">
              {itensManutencao.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={itensSelecionados.includes(item.id)}
                    onChange={() => toggleItemManutencao(item.id)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.categoria === 'FILTRO' ? 'bg-blue-100 text-blue-800' :
                        item.categoria === 'OLEO' ? 'bg-amber-100 text-amber-800' :
                        item.categoria === 'CORREIA' ? 'bg-purple-100 text-purple-800' :
                        item.categoria === 'PNEU' ? 'bg-gray-100 text-gray-800' :
                        item.categoria === 'BATERIA' ? 'bg-green-100 text-green-800' :
                        item.categoria === 'FLUIDO' ? 'bg-cyan-100 text-cyan-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.categoria}
                      </span>
                      <span className="font-medium text-gray-900">{item.produto_nome}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      <span>Quantidade: {item.quantidade_necessaria}</span>
                      {item.periodicidade_km && (
                        <span>Trocar a cada {item.periodicidade_km.toLocaleString('pt-BR')} km</span>
                      )}
                      {item.periodicidade_horas && (
                        <span>Trocar a cada {item.periodicidade_horas.toLocaleString('pt-BR')} horas</span>
                      )}
                      {item.periodicidade_dias && (
                        <span>Trocar a cada {item.periodicidade_dias} dias</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchProduto}
                      onChange={(e) => setSearchProduto(e.target.value)}
                      className="w-full px-3 py-2 border rounded text-gray-900 bg-white placeholder-gray-400"
                    />
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
                      {produtosFiltrados.map((p) => (
                        <option key={p.id} value={p.id} className="text-black bg-white">
                          {p.codigo ? `${p.codigo} - ` : ''}{p.nome}
                        </option>
                      ))}
                    </select>
                    {searchProduto && (
                      <div className="text-xs text-gray-600">
                        {produtosFiltrados.length} produto(s) encontrado(s)
                      </div>
                    )}
                  </div>
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
