'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { equipamentosApi, itensManutencaoApi, almoxarifadoApi, Equipamento, ItemManutencao, Produto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const CATEGORIAS = [
  { value: 'FILTRO', label: 'Filtro' },
  { value: 'OLEO', label: 'Óleo/Lubrificante' },
  { value: 'CORREIA', label: 'Correia' },
  { value: 'PNEU', label: 'Pneu' },
  { value: 'BATERIA', label: 'Bateria' },
  { value: 'FLUIDO', label: 'Fluido' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function ItensManutencaoEquipamentoPage() {
  const params = useParams();
  const toast = useToast();
  const equipamentoId = Number(params.id);

  const [equipamento, setEquipamento] = useState<Equipamento | null>(null);
  const [itens, setItens] = useState<ItemManutencao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemManutencao | null>(null);

  const [formData, setFormData] = useState({
    produto: '',
    categoria: 'OUTRO',
    descricao: '',
    quantidade_necessaria: '1',
    periodicidade_km: '',
    periodicidade_horas: '',
    periodicidade_dias: '',
    ativo: true,
    observacoes: '',
  });

  useEffect(() => {
    loadData();
  }, [equipamentoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [equipData, itensData, produtosData] = await Promise.all([
        equipamentosApi.get(equipamentoId),
        itensManutencaoApi.list({ equipamento: equipamentoId }),
        almoxarifadoApi.produtos.list({ page_size: 1000 }),
      ]);
      setEquipamento(equipData);
      setItens(itensData.results);
      setProdutos(produtosData.results);
    } catch (err: any) {
      toast?.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: ItemManutencao) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        produto: String(item.produto),
        categoria: item.categoria,
        descricao: item.descricao,
        quantidade_necessaria: item.quantidade_necessaria,
        periodicidade_km: item.periodicidade_km ? String(item.periodicidade_km) : '',
        periodicidade_horas: item.periodicidade_horas ? String(item.periodicidade_horas) : '',
        periodicidade_dias: item.periodicidade_dias ? String(item.periodicidade_dias) : '',
        ativo: item.ativo,
        observacoes: item.observacoes,
      });
    } else {
      setEditingItem(null);
      setFormData({
        produto: '',
        categoria: 'OUTRO',
        descricao: '',
        quantidade_necessaria: '1',
        periodicidade_km: '',
        periodicidade_horas: '',
        periodicidade_dias: '',
        ativo: true,
        observacoes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.produto) {
      toast?.error('Selecione um produto');
      return;
    }

    try {
      const data = {
        equipamento: equipamentoId,
        produto: Number(formData.produto),
        categoria: formData.categoria,
        descricao: formData.descricao,
        quantidade_necessaria: formData.quantidade_necessaria,
        periodicidade_km: formData.periodicidade_km ? Number(formData.periodicidade_km) : null,
        periodicidade_horas: formData.periodicidade_horas ? Number(formData.periodicidade_horas) : null,
        periodicidade_dias: formData.periodicidade_dias ? Number(formData.periodicidade_dias) : null,
        ativo: formData.ativo,
        observacoes: formData.observacoes,
      };

      if (editingItem) {
        await itensManutencaoApi.update(editingItem.id, data);
        toast?.success('Item atualizado com sucesso!');
      } else {
        await itensManutencaoApi.create(data);
        toast?.success('Item cadastrado com sucesso!');
      }

      handleCloseModal();
      loadData();
    } catch (err: any) {
      toast?.error(err.message || 'Erro ao salvar item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      await itensManutencaoApi.delete(id);
      toast?.success('Item excluído com sucesso!');
      loadData();
    } catch (err: any) {
      toast?.error('Erro ao excluir item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!equipamento) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Equipamento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard/equipamentos" className="hover:text-blue-600">
            Equipamentos
          </Link>
          <span>/</span>
          <Link href={`/dashboard/equipamentos/${equipamentoId}`} className="hover:text-blue-600">
            {equipamento.codigo}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Itens de Manutenção</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Itens de Manutenção</h1>
            <p className="text-sm text-gray-500 mt-1">
              {equipamento.codigo} - {equipamento.descricao}
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Adicionar Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Periodicidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum item cadastrado
                  </td>
                </tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {item.categoria_display}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.produto_nome}</div>
                      {item.descricao && (
                        <div className="text-sm text-gray-500">{item.descricao}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantidade_necessaria} {item.unidade_sigla}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.periodicidade_km && <div>{item.periodicidade_km} km</div>}
                      {item.periodicidade_horas && <div>{item.periodicidade_horas} horas</div>}
                      {item.periodicidade_dias && <div>{item.periodicidade_dias} dias</div>}
                      {!item.periodicidade_km && !item.periodicidade_horas && !item.periodicidade_dias && (
                        <div className="text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        item.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Editar Item' : 'Adicionar Item'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="produto" className="block text-sm font-medium text-gray-900 mb-1">
                    Produto <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="produto"
                    value={formData.produto}
                    onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Selecione...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-900 mb-1">
                    Categoria
                  </label>
                  <select
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-900 mb-1">
                    Descrição / Localização
                  </label>
                  <input
                    type="text"
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Ex: Filtro de óleo - lado direito do motor"
                  />
                </div>

                <div>
                  <label htmlFor="quantidade_necessaria" className="block text-sm font-medium text-gray-900 mb-1">
                    Quantidade Necessária
                  </label>
                  <input
                    type="number"
                    id="quantidade_necessaria"
                    value={formData.quantidade_necessaria}
                    onChange={(e) => setFormData({ ...formData, quantidade_necessaria: e.target.value })}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Periodicidade de Manutenção</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="periodicidade_km" className="block text-sm font-medium text-gray-700 mb-1">
                      A cada (KM)
                    </label>
                    <input
                      type="number"
                      id="periodicidade_km"
                      value={formData.periodicidade_km}
                      onChange={(e) => setFormData({ ...formData, periodicidade_km: e.target.value })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Ex: 10000"
                    />
                  </div>

                  <div>
                    <label htmlFor="periodicidade_horas" className="block text-sm font-medium text-gray-700 mb-1">
                      A cada (Horas)
                    </label>
                    <input
                      type="number"
                      id="periodicidade_horas"
                      value={formData.periodicidade_horas}
                      onChange={(e) => setFormData({ ...formData, periodicidade_horas: e.target.value })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Ex: 250"
                    />
                  </div>

                  <div>
                    <label htmlFor="periodicidade_dias" className="block text-sm font-medium text-gray-700 mb-1">
                      A cada (Dias)
                    </label>
                    <input
                      type="number"
                      id="periodicidade_dias"
                      value={formData.periodicidade_dias}
                      onChange={(e) => setFormData({ ...formData, periodicidade_dias: e.target.value })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Ex: 90"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="observacoes" className="block text-sm font-medium text-gray-900 mb-1">
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                  Item Ativo
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
