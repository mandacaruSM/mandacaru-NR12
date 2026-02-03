'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  pedidosCompraApi,
  fornecedoresApi,
  clientesApi,
  equipamentosApi,
  almoxarifadoApi,
  orcamentosApi,
  ordensServicoApi,
  type Fornecedor,
  type Cliente,
  type Equipamento,
  type LocalEstoque,
  type Orcamento,
  type OrdemServico,
  type Produto,
  type ItemPedidoCompra,
} from '@/lib/api';

interface ItemForm {
  produto: number | null;
  descricao: string;
  codigo_fornecedor: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
}

export default function NovoPedidoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Options
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [locaisEstoque, setLocaisEstoque] = useState<LocalEstoque[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // Form
  const [form, setForm] = useState({
    fornecedor: '',
    destino: 'PROPRIO',
    cliente: '',
    equipamento: '',
    orcamento: '',
    ordem_servico: '',
    local_estoque: '',
    data_previsao: '',
    observacoes: '',
  });

  // Itens
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [novoItem, setNovoItem] = useState<ItemForm>({
    produto: null,
    descricao: '',
    codigo_fornecedor: '',
    quantidade: 1,
    unidade: 'UN',
    valor_unitario: 0,
  });

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    const [fornRes, cliRes, locRes, prodRes] = await Promise.all([
      fornecedoresApi.list({ ativo: true }).catch(() => ({ results: [] as Fornecedor[], count: 0 })),
      clientesApi.list({ page_size: 1000 }).catch(() => ({ results: [] as Cliente[], count: 0 })),
      almoxarifadoApi.locais.list().catch(() => ({ results: [] as LocalEstoque[], count: 0 })),
      almoxarifadoApi.produtos.list({ ativo: true }).catch(() => ({ results: [] as Produto[], count: 0 })),
    ]);
    setFornecedores(fornRes.results || []);
    setClientes(cliRes.results || []);
    setLocaisEstoque(locRes.results || []);
    setProdutos(prodRes.results || []);
  }

  // Carregar equipamentos quando cliente mudar
  useEffect(() => {
    if (form.cliente) {
      equipamentosApi.list({ cliente: Number(form.cliente) })
        .then(data => setEquipamentos(data.results || []))
        .catch(() => setEquipamentos([]));
    } else {
      setEquipamentos([]);
    }
  }, [form.cliente]);

  // Carregar orcamentos e OS quando cliente mudar
  useEffect(() => {
    if (form.cliente) {
      orcamentosApi.list({ cliente: Number(form.cliente), status: 'APROVADO' })
        .then(data => setOrcamentos(data.results || []))
        .catch(() => setOrcamentos([]));
      ordensServicoApi.list({ cliente: Number(form.cliente) })
        .then(data => setOrdensServico((data.results || []).filter((os: OrdemServico) => os.status !== 'CANCELADA')))
        .catch(() => setOrdensServico([]));
    } else {
      setOrcamentos([]);
      setOrdensServico([]);
    }
  }, [form.cliente]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addItem() {
    if (!novoItem.descricao.trim()) return;
    setItens(prev => [...prev, { ...novoItem }]);
    setNovoItem({ produto: null, descricao: '', codigo_fornecedor: '', quantidade: 1, unidade: 'UN', valor_unitario: 0 });
  }

  function removeItem(index: number) {
    setItens(prev => prev.filter((_, i) => i !== index));
  }

  function handleProdutoSelect(produtoId: string) {
    if (produtoId) {
      const prod = produtos.find(p => p.id === Number(produtoId));
      if (prod) {
        setNovoItem(prev => ({
          ...prev,
          produto: prod.id,
          descricao: prod.nome,
          unidade: prod.unidade_sigla || 'UN',
        }));
      }
    } else {
      setNovoItem(prev => ({ ...prev, produto: null }));
    }
  }

  function calcTotal() {
    return itens.reduce((sum, item) => sum + item.quantidade * item.valor_unitario, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fornecedor) { setError('Selecione um fornecedor'); return; }
    if (itens.length === 0) { setError('Adicione pelo menos um item'); return; }

    try {
      setSaving(true);
      setError('');

      const payload: any = {
        fornecedor: Number(form.fornecedor),
        destino: form.destino,
        observacoes: form.observacoes,
        itens_data: itens.map(item => ({
          produto: item.produto,
          descricao: item.descricao,
          codigo_fornecedor: item.codigo_fornecedor,
          quantidade: item.quantidade,
          unidade: item.unidade,
          valor_unitario: item.valor_unitario,
        })),
      };

      if (form.cliente) payload.cliente = Number(form.cliente);
      if (form.equipamento) payload.equipamento = Number(form.equipamento);
      if (form.orcamento) payload.orcamento = Number(form.orcamento);
      if (form.ordem_servico) payload.ordem_servico = Number(form.ordem_servico);
      if (form.local_estoque) payload.local_estoque = Number(form.local_estoque);
      if (form.data_previsao) payload.data_previsao = form.data_previsao;

      const result = await pedidosCompraApi.create(payload);
      router.push(`/dashboard/compras/pedidos/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Pedido de Compra</h1>
        <Link href="/dashboard/compras" className="text-sm text-blue-600 hover:underline">
          &larr; Voltar
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Principais */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Pedido</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Fornecedor *</label>
              <select name="fornecedor" value={form.fornecedor} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-black bg-white" required>
                <option value="">Selecione...</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Destino Financeiro *</label>
              <select name="destino" value={form.destino} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-black bg-white">
                <option value="PROPRIO">Compra Propria (Almoxarifado)</option>
                <option value="CLIENTE">Encaminhar para Cliente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Cliente</label>
              <select name="cliente" value={form.cliente} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-black bg-white">
                <option value="">Nenhum</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_razao}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Equipamento</label>
              <select name="equipamento" value={form.equipamento} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-black bg-white">
                <option value="">Nenhum</option>
                {equipamentos.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.codigo} - {eq.descricao}</option>
                ))}
              </select>
            </div>
            {form.destino === 'CLIENTE' && form.cliente && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Orcamento Vinculado</label>
                  <select name="orcamento" value={form.orcamento} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded text-black bg-white">
                    <option value="">Nenhum</option>
                    {orcamentos.map(o => (
                      <option key={o.id} value={o.id}>#{o.numero} - R$ {Number(o.valor_total || 0).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Ordem de Servico Vinculada</label>
                  <select name="ordem_servico" value={form.ordem_servico} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded text-black bg-white">
                    <option value="">Nenhuma</option>
                    {ordensServico.map(os => (
                      <option key={os.id} value={os.id}>OS-{os.numero} - {os.status_display} - {os.equipamento_codigo || ''}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Local de Estoque (entrega)</label>
              <select name="local_estoque" value={form.local_estoque} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-black bg-white">
                <option value="">Nenhum</option>
                {locaisEstoque.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Previsao de Entrega</label>
              <input type="date" name="data_previsao" value={form.data_previsao} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">Observacoes</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Itens do Pedido</h2>

          {/* Adicionar Item */}
          <div className="border border-dashed border-gray-300 rounded p-4 mb-4">
            <div className="grid grid-cols-6 gap-3 items-end">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Produto (opcional)</label>
                <select
                  value={novoItem.produto || ''}
                  onChange={(e) => handleProdutoSelect(e.target.value)}
                  className="w-full px-2 py-1.5 border rounded text-sm text-black bg-white"
                >
                  <option value="">Item manual</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Descricao *</label>
                <input type="text" value={novoItem.descricao}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded text-sm text-gray-900 bg-white"
                  placeholder="Descricao do item" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cod. Fornecedor</label>
                <input type="text" value={novoItem.codigo_fornecedor}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, codigo_fornecedor: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded text-sm text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unidade</label>
                <input type="text" value={novoItem.unidade}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, unidade: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded text-sm text-gray-900 bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3 items-end mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                <input type="number" step="0.001" min="0.001" value={novoItem.quantidade}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 border rounded text-sm text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor Unit. (R$)</label>
                <input type="number" step="0.01" min="0" value={novoItem.valor_unitario}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, valor_unitario: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 border rounded text-sm text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subtotal</label>
                <p className="text-sm font-medium text-gray-900 py-1.5">
                  R$ {(novoItem.quantidade * novoItem.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="col-span-3 flex justify-end">
                <button type="button" onClick={addItem}
                  className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                  Adicionar Item
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Itens */}
          {itens.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum item adicionado</p>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Descricao</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Cod. Forn.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Qtd</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Un</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Vlr Unit.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Subtotal</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itens.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.descricao}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.codigo_fornecedor || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantidade}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.unidade}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      R$ {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                      R$ {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => removeItem(idx)}
                        className="text-red-600 hover:text-red-900 text-sm">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={5} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">TOTAL:</td>
                  <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                    R$ {calcTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Botoes */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/compras"
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Criar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}
