'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fornecedoresApi, type Fornecedor } from '@/lib/api';

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadFornecedores();
  }, [search]);

  async function loadFornecedores() {
    try {
      setLoading(true);
      const data = await fornecedoresApi.list({ search: search || undefined });
      setFornecedores(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Deseja realmente excluir este fornecedor?')) return;
    try {
      await fornecedoresApi.delete(id);
      loadFornecedores();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir');
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <Link href="/dashboard/compras" className="text-sm text-blue-600 hover:underline">
            &larr; Voltar para Compras
          </Link>
        </div>
        <Link
          href="/dashboard/compras/fornecedores/novo"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Novo Fornecedor
        </Link>
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CNPJ, especialidade, cidade..."
          className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : fornecedores.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhum fornecedor encontrado</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">CNPJ/CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Especialidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Cidade/UF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fornecedores.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{f.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{f.cnpj_cpf || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{f.contato || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{f.telefone || f.whatsapp || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{f.especialidade || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {f.cidade && f.uf ? `${f.cidade}/${f.uf}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <Link href={`/dashboard/compras/fornecedores/${f.id}`} className="text-blue-600 hover:text-blue-900">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:text-red-900">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
