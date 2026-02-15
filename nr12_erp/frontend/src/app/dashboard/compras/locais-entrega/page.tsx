'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { locaisEntregaApi, type LocalEntrega } from '@/lib/api';

export default function LocaisEntregaPage() {
  const [locais, setLocais] = useState<LocalEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLocais();
  }, [search]);

  async function loadLocais() {
    try {
      setLoading(true);
      const data = await locaisEntregaApi.list({ search: search || undefined });
      setLocais(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar locais de entrega:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Deseja realmente excluir este local de entrega?')) return;
    try {
      await locaisEntregaApi.delete(id);
      loadLocais();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir');
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locais de Entrega</h1>
          <Link href="/dashboard/compras" className="text-sm text-blue-600 hover:underline">
            &larr; Voltar para Compras
          </Link>
        </div>
        <Link
          href="/dashboard/compras/locais-entrega/novo"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Novo Local
        </Link>
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, responsavel, cidade..."
          className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : locais.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhum local de entrega encontrado</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Responsavel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Endereco</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Cidade/UF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locais.map((local) => (
                <tr key={local.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{local.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{local.responsavel || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{local.telefone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {local.logradouro ? `${local.logradouro}${local.numero ? `, ${local.numero}` : ''}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {local.cidade && local.uf ? `${local.cidade}/${local.uf}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${local.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {local.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <Link href={`/dashboard/compras/locais-entrega/${local.id}`} className="text-blue-600 hover:text-blue-900">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(local.id)} className="text-red-600 hover:text-red-900">
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
