'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { almoxarifadoApi, type Local } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function LocaisPage() {
  const toast = useToast();
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    ativo: true,
  });

  useEffect(() => {
    loadLocais();
  }, []);

  async function loadLocais() {
    try {
      setLoading(true);
      const data = await almoxarifadoApi.locais.list();
      setLocais(Array.isArray(data) ? data : (data as any).results || []);
    } catch (error) {
      console.error('Erro ao carregar locais:', error);
      toast?.error('Erro ao carregar locais');
    } finally {
      setLoading(false);
    }
  }

  function handleNovo() {
    setEditingLocal(null);
    setFormData({
      codigo: '',
      descricao: '',
      ativo: true,
    });
    setShowModal(true);
  }

  function handleEditar(local: Local) {
    setEditingLocal(local);
    setFormData({
      codigo: local.codigo,
      descricao: local.descricao,
      ativo: local.ativo,
    });
    setShowModal(true);
  }

  async function handleSalvar() {
    try {
      if (!formData.codigo || !formData.descricao) {
        toast?.error('Preencha todos os campos obrigatórios');
        return;
      }

      if (editingLocal) {
        await almoxarifadoApi.locais.update(editingLocal.id, formData);
        toast?.success('Local atualizado com sucesso');
      } else {
        await almoxarifadoApi.locais.create(formData);
        toast?.success('Local cadastrado com sucesso');
      }

      setShowModal(false);
      loadLocais();
    } catch (error: any) {
      console.error('Erro ao salvar local:', error);
      toast?.error(error.message || 'Erro ao salvar local');
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Tem certeza que deseja excluir este local?')) return;

    try {
      await almoxarifadoApi.locais.remove(id);
      toast?.success('Local excluído com sucesso');
      loadLocais();
    } catch (error: any) {
      console.error('Erro ao excluir local:', error);
      toast?.error(error.message || 'Erro ao excluir local');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando locais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locais de Armazenamento</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie os locais físicos do almoxarifado
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNovo}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Novo Local
          </button>
          <Link
            href="/dashboard/almoxarifado"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* Lista de Locais */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {locais.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum local cadastrado</h3>
            <p className="mt-2 text-sm text-gray-600">
              Comece cadastrando o primeiro local de armazenamento.
            </p>
            <button
              onClick={handleNovo}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Cadastrar Primeiro Local
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
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
                {locais.map((local) => (
                  <tr key={local.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {local.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {local.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        local.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {local.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditar(local)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(local.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingLocal ? 'Editar Local' : 'Novo Local'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white font-mono"
                  placeholder="Ex: A1, B2, GALPAO-1"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                  placeholder="Ex: Prateleira A1, Galpão Principal"
                  maxLength={100}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="ativo" className="ml-2 text-sm text-gray-900">
                  Local ativo
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
