// frontend/src/app/dashboard/tipos-equipamento/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { tiposEquipamentoApi, TipoEquipamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function TiposEquipamentoPage() {
  const toast = useToast();
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
  });

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      setLoading(true);
      const response = await tiposEquipamentoApi.list();
      setTipos(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar tipos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await tiposEquipamentoApi.update(editingId, formData);
        toast.success('Tipo atualizado com sucesso!');
      } else {
        await tiposEquipamentoApi.create(formData);
        toast.success('Tipo cadastrado com sucesso!');
      }

      setFormData({ nome: '', descricao: '', ativo: true });
      setShowForm(false);
      setEditingId(null);
      loadTipos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar tipo');
    }
  };

  const handleEdit = (tipo: TipoEquipamento) => {
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao,
      ativo: tipo.ativo,
    });
    setEditingId(tipo.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Deseja excluir o tipo "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;

    try {
      await tiposEquipamentoApi.delete(id);
      toast.success('Tipo excluído com sucesso!');
      loadTipos();
    } catch (err: any) {
      toast.error('Erro ao excluir tipo. Pode haver equipamentos vinculados a ele.');
    }
  };

  const handleCancel = () => {
    setFormData({ nome: '', descricao: '', ativo: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleToggleStatus = async (tipo: TipoEquipamento) => {
    try {
      await tiposEquipamentoApi.update(tipo.id, { ativo: !tipo.ativo });
      toast.success(`Tipo ${!tipo.ativo ? 'ativado' : 'desativado'} com sucesso!`);
      loadTipos();
    } catch (err: any) {
      toast.error('Erro ao alterar status');
    }
  };

  // Filtros
  const filteredTipos = tipos.filter(tipo => {
    const matchSearch = tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (tipo.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || 
                       (filterStatus === 'active' && tipo.ativo) ||
                       (filterStatus === 'inactive' && !tipo.ativo);
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando tipos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Equipamento</h1>
            <p className="text-gray-900 mt-1">
              {filteredTipos.length} de {tipos.length} tipo(s) cadastrado(s)
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? '✕ Cancelar' : '+ Novo Tipo'}
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </select>

          {(searchTerm || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? '✏️ Editar Tipo de Equipamento' : '➕ Novo Tipo de Equipamento'}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Tipo *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                placeholder="Ex: Escavadeira Hidráulica"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                placeholder="Ex: Equipamento para escavação e movimentação de terra em obras civis e mineração"
              />
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  id="ativo"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Tipo ativo
                </label>
                <p className="text-sm text-gray-500">
                  Tipos inativos não aparecem na seleção ao cadastrar equipamentos
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingId ? 'Atualizar Tipo' : 'Cadastrar Tipo'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredTipos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg">
              {searchTerm || filterStatus !== 'all' 
                ? 'Nenhum tipo encontrado com os filtros aplicados' 
                : 'Nenhum tipo cadastrado'}
            </p>
            {!showForm && !searchTerm && filterStatus === 'all' && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 hover:underline"
              >
                Cadastre o primeiro tipo
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTipos.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-semibold text-lg">
                            🏷️
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {tipo.nome}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {tipo.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="text-sm text-gray-900 line-clamp-2">
                        {tipo.descricao || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(tipo)}
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-colors ${
                          tipo.ativo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {tipo.ativo ? '✓ Ativo' : '✕ Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(tipo)}
                        className="text-blue-600 hover:text-blue-900 mr-4 transition-colors"
                        title="Editar"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDelete(tipo.id, tipo.nome)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Excluir"
                      >
                        🗑️ Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Informação sobre Bot */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex">
          <span className="text-2xl mr-3">🤖</span>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Integração com Bot Telegram</h3>
            <p className="text-sm text-blue-700 mt-1">
              Em breve você poderá gerenciar manutenções e abastecimentos via bot do Telegram. 
              Os tipos de equipamento cadastrados aqui serão utilizados no bot para facilitar o registro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}