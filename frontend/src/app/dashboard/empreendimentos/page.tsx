// frontend/src/app/dashboard/empreendimentos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { empreendimentosApi, clientesApi, Empreendimento, Cliente } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const TIPO_LABELS = {
  'LAVRA': 'Lavra',
  'OBRA': 'Obra',
  'PLANTA': 'Planta',
  'OUTRO': 'Outro',
};

export default function EmpreendimentosPage() {
  const toast = useToast();
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<string>('');

  useEffect(() => {
    loadClientes();
    loadEmpreendimentos();
  }, []);

  const loadClientes = async () => {
    try {
      const response = await clientesApi.list();
      setClientes(response.results);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const loadEmpreendimentos = async (filters?: { cliente?: number; search?: string }) => {
    try {
      setLoading(true);
      setError('');
      const response = await empreendimentosApi.list(filters);
      setEmpreendimentos(response.results);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar empreendimentos';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: any = {};
    if (searchTerm) filters.search = searchTerm;
    if (selectedCliente) filters.cliente = Number(selectedCliente);
    loadEmpreendimentos(filters);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCliente('');
    loadEmpreendimentos();
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Deseja realmente excluir o empreendimento "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await empreendimentosApi.delete(id);
      toast.success('Empreendimento excluído com sucesso!');
      await loadEmpreendimentos();
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao excluir empreendimento';
      setError(errorMsg);
      toast.error(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading && empreendimentos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando empreendimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Empreendimentos</h1>
              <p className="text-gray-600 mt-1">
                {empreendimentos.length} empreendimento{empreendimentos.length !== 1 ? 's' : ''} cadastrado{empreendimentos.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Link
              href="/dashboard/empreendimentos/novo"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              + Novo Empreendimento
            </Link>
          </div>

          {/* Filtros */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
            />

            <select
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
            >
              <option value="">Todos os clientes</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome_razao}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔍 Buscar
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Lista de Empreendimentos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {empreendimentos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum empreendimento encontrado</p>
            <Link
              href="/dashboard/empreendimentos/novo"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700"
            >
              Cadastre o primeiro empreendimento
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empreendimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distância
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
                {empreendimentos.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-lg">
                            🏗️
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {emp.nome}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{emp.cliente_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {TIPO_LABELS[emp.tipo]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{emp.distancia_km} km</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          emp.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {emp.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/empreendimentos/${emp.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        ✏️ Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(emp.id, emp.nome)}
                        className="text-red-600 hover:text-red-900"
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
    </div>
  );
}