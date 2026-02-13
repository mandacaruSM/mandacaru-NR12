// frontend/src/app/dashboard/nr12/modelos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { nr12Api, tiposEquipamentoApi } from '@/lib/api';
import type { ModeloChecklist, TipoEquipamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const PERIODICIDADE_LABELS = {
  'DIARIO': 'Diário',
  'SEMANAL': 'Semanal',
  'QUINZENAL': 'Quinzenal',
  'MENSAL': 'Mensal',
};

export default function ModelosChecklistPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');

  // OPERADOR e TECNICO não podem criar/editar modelos
  const isOperador = user?.profile?.role === 'OPERADOR';
  const isTecnico = user?.profile?.role === 'TECNICO';
  const canEdit = !isOperador && !isTecnico;

  useEffect(() => {
    loadTipos();
    loadModelos();
  }, []);

  const loadTipos = async () => {
    try {
      const response = await tiposEquipamentoApi.list();
      setTipos(response.results || []);
    } catch (err: any) {
      console.error('Erro ao carregar tipos:', err);
    }
  };

  const loadModelos = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterTipo) filters.tipo_equipamento = Number(filterTipo);
      if (filterStatus !== 'all') filters.ativo = filterStatus === 'active';
      if (searchTerm) filters.search = searchTerm;

      const response = await nr12Api.modelos.list(filters);
      setModelos(response.results || []);
    } catch (err: any) {
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadModelos();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterTipo('');
    setFilterStatus('active');
    setTimeout(loadModelos, 0);
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Deseja excluir o modelo "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await nr12Api.modelos.delete(id);
      toast.success('Modelo excluído com sucesso!');
      loadModelos();
    } catch (err: any) {
      toast.error('Erro ao excluir modelo. Pode haver checklists vinculados.');
    }
  };

  const handleDuplicar = async (id: number, nome: string) => {
    if (!confirm(`Deseja duplicar o modelo "${nome}"?`)) {
      return;
    }

    try {
      await nr12Api.modelos.duplicar(id);
      toast.success('Modelo duplicado com sucesso!');
      loadModelos();
    } catch (err: any) {
      toast.error('Erro ao duplicar modelo');
    }
  };

  const filteredModelos = modelos.filter(modelo => {
    const matchSearch = modelo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (modelo.tipo_equipamento_nome?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando modelos...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Modelos de Checklist</h1>
            <p className="text-gray-900 mt-1">
              {filteredModelos.length} de {modelos.length} modelo(s) cadastrado(s)
            </p>
          </div>
          {canEdit && (
            <Link
              href="/dashboard/nr12/modelos/novo"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center"
            >
              + Novo Modelo
            </Link>
          )}
        </div>

        {/* Filtros */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar modelos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(e as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
          />

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-purple-500"
          >
            <option value="">Todos os tipos</option>
            {tipos.map(tipo => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-purple-500"
          >
            <option value="all">Todos os status</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              🔍 Buscar
            </button>
            {(searchTerm || filterTipo || filterStatus !== 'active') && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Modelos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredModelos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-500 text-lg">
              {searchTerm || filterTipo || filterStatus !== 'active'
                ? 'Nenhum modelo encontrado com os filtros aplicados'
                : 'Nenhum modelo cadastrado'}
            </p>
            {!searchTerm && !filterTipo && filterStatus === 'active' && canEdit && (
              <Link
                href="/dashboard/nr12/modelos/novo"
                className="inline-block mt-4 text-purple-600 hover:underline"
              >
                Cadastre o primeiro modelo
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periodicidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Itens
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
                {filteredModelos.map((modelo) => (
                  <tr key={modelo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-semibold text-lg">
                            📝
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {modelo.nome}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {modelo.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {modelo.tipo_equipamento_nome || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {PERIODICIDADE_LABELS[modelo.periodicidade]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        <span className="text-lg font-bold text-gray-900">
                          {modelo.total_itens || 0}
                        </span>
                        <span className="text-sm text-gray-500">itens</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          modelo.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {modelo.ativo ? '✓ Ativo' : '✕ Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/nr12/modelos/${modelo.id}`}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Ver detalhes"
                        >
                          👁️
                        </Link>
                        {canEdit && (
                          <>
                            <Link
                              href={`/dashboard/nr12/modelos/${modelo.id}/editar`}
                              className="text-purple-600 hover:text-purple-900 transition-colors"
                              title="Editar"
                            >
                              ✏️
                            </Link>
                            <button
                              onClick={() => handleDuplicar(modelo.id, modelo.nome)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Duplicar"
                            >
                              📋
                            </button>
                            <button
                              onClick={() => handleDelete(modelo.id, modelo.nome)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex">
          <span className="text-2xl mr-3">💡</span>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Dica</h3>
            <p className="text-sm text-blue-700 mt-1">
              Modelos de checklist são templates vinculados a tipos de equipamento. 
              Crie modelos completos com todos os itens necessários para facilitar 
              a execução pelos operadores via bot ou interface web.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}