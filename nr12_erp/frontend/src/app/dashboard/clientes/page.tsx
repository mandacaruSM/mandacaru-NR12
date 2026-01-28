// frontend/src/app/dashboard/clientes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { clientesApi, Cliente } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ClientesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [resettingPassword, setResettingPassword] = useState<number | null>(null);

  // Verifica se usuario e admin
  const isAdmin = user?.profile?.role === 'ADMIN';

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async (search?: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await clientesApi.list(search ? { search } : {});
      setClientes(response.results);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar clientes';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClientes(searchTerm);
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Deseja realmente excluir o cliente "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await clientesApi.delete(id);
      toast.success('Cliente excluído com sucesso!');
      await loadClientes(searchTerm);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao excluir cliente';
      setError(errorMsg);
      toast.error(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResetPassword = async (id: number, nome: string, documento: string) => {
    const novaSenha = prompt(
      `Resetar senha do cliente "${nome}"?\n\nDigite a nova senha (minimo 6 caracteres) ou deixe vazio para gerar automaticamente:`
    );

    // Usuario cancelou
    if (novaSenha === null) return;

    // Validar senha se fornecida
    if (novaSenha && novaSenha.length < 6) {
      toast.error('A senha deve ter no minimo 6 caracteres');
      return;
    }

    try {
      setResettingPassword(id);

      const response = await fetch(`/api/proxy/cadastro/clientes/${id}/resetar_senha/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: novaSenha ? JSON.stringify({ senha: novaSenha }) : '{}',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Erro ao resetar senha');
      }

      // Mostra a nova senha para o admin copiar
      const senhaGerada = data.nova_senha || novaSenha;
      toast.success(`Senha resetada com sucesso!`);

      // Alerta com as credenciais para o admin passar ao cliente
      alert(
        `Credenciais do cliente:\n\n` +
        `Usuario: ${documento}\n` +
        `Senha: ${senhaGerada}\n\n` +
        `Anote estas informacoes para enviar ao cliente.`
      );
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao resetar senha';
      toast.error(errorMsg);
    } finally {
      setResettingPassword(null);
    }
  };

  if (loading && clientes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Busca */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-900 mt-1">
              {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔍
              </button>
            </form>

            <Link
              href="/dashboard/clientes/novo"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              + Novo Cliente
            </Link>
          </div>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Lista de Clientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {clientes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum cliente encontrado</p>
            <Link
              href="/dashboard/clientes/novo"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700"
            >
              Cadastre o primeiro cliente
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cidade/UF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
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
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {cliente.nome_razao.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {cliente.nome_razao}
                          </div>
                          <div className="text-sm text-gray-500">
                            {cliente.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.documento || '-'}</div>
                      {cliente.inscricao_estadual && (
                        <div className="text-sm text-gray-500">IE: {cliente.inscricao_estadual}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cliente.cidade || '-'}{cliente.cidade && cliente.uf ? '/' : ''}{cliente.uf}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.telefone || '-'}</div>
                      <div className="text-sm text-gray-500">{cliente.email_financeiro || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          cliente.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {cliente.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Botao Resetar Senha - apenas para Admin */}
                      {isAdmin && (
                        <button
                          onClick={() => handleResetPassword(cliente.id, cliente.nome_razao, cliente.documento || '')}
                          disabled={resettingPassword === cliente.id}
                          className="text-orange-600 hover:text-orange-900 mr-3 disabled:opacity-50"
                          title="Resetar senha do cliente"
                        >
                          {resettingPassword === cliente.id ? (
                            <span className="inline-flex items-center">
                              <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </span>
                          ) : (
                            '🔑'
                          )}
                        </button>
                      )}
                      <Link
                        href={`/dashboard/clientes/${cliente.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        ✏️ Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(cliente.id, cliente.nome_razao)}
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