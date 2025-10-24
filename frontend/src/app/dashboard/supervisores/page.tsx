// frontend/src/app/dashboard/supervisores/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supervisoresApi, Supervisor } from '@/lib/api/operadores';
import { useToast } from '@/contexts/ToastContext';

export default function SupervisoresPage() {
  const toast = useToast();
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadSupervisores();
  }, [search, filterAtivo, page]);

  const loadSupervisores = async () => {
    try {
      setLoading(true);
      const response = await supervisoresApi.list({
        search: search || undefined,
        ativo: filterAtivo !== null ? filterAtivo : undefined,
        page,
      });
      setSupervisores(response.results);
      setTotal(response.count);
    } catch (error: any) {
      toast.error('Erro ao carregar supervisores');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Tem certeza que deseja deletar ${nome}?`)) return;

    try {
      await supervisoresApi.delete(id);
      toast.success('Supervisor deletado com sucesso!');
      setSupervisores(supervisores.filter(sup => sup.id !== id));
    } catch (error: any) {
      toast.error('Erro ao deletar supervisor');
    }
  };

  const handleGerarCodigo = async (id: number, nome: string) => {
    try {
      const result = await supervisoresApi.gerarCodigoVinculacao(id);
      toast.success(`Código gerado: ${result.codigo}`);
    } catch (error: any) {
      toast.error('Erro ao gerar código');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Supervisores</h1>
        <Link
          href="/dashboard/supervisores/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
        >
          + Novo Supervisor
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por nome, CPF ou email
            </label>
            <input
              type="text"
              placeholder="Maria Silva..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterAtivo === null ? '' : filterAtivo ? 'true' : 'false'}
              onChange={(e) => {
                if (e.target.value === '') setFilterAtivo(null);
                else setFilterAtivo(e.target.value === 'true');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setFilterAtivo(null);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-md transition"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        ) : supervisores.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            Nenhum supervisor encontrado
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">CPF</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Telegram</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {supervisores.map((sup) => (
                  <tr key={sup.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">{sup.nome_completo}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sup.cpf}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sup.email}</td>
                    <td className="px-6 py-4 text-sm">
                      {sup.telegram_vinculado ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Vinculado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ✗ Não vinculado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        sup.ativo ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {sup.ativo ? '✓ Ativo' : '✗ Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/supervisores/${sup.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleGerarCodigo(sup.id, sup.nome_completo)}
                          className="text-green-600 hover:text-green-800 font-medium"
                          title="Gerar código de vinculação Telegram"
                        >
                          Gerar Código
                        </button>
                        <button
                          onClick={() => handleDelete(sup.id, sup.nome_completo)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}