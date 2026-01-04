'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Tecnico {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
}

export default function TecnicosPage() {
  const [items, setItems] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErro(null);
      const data = await api<any>('/tecnicos/');

      // Tratar resposta paginada ou array direto
      if (Array.isArray(data)) {
        setItems(data);
      } else if (data && Array.isArray(data.results)) {
        setItems(data.results);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      console.error('Erro ao listar técnicos:', e);
      setErro(e.message || 'Erro ao listar técnicos');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRemove = async (id: number) => {
    if (!confirm('Excluir este técnico?')) return;
    try {
      await api(`/tecnicos/${id}/`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      alert(e.message || 'Falha ao remover');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Técnicos 👨‍🔧</h1>
          <p className="text-gray-900">Total: {items.length}</p>
        </div>
        <Link
          href="/dashboard/tecnicos/novo"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Novo Técnico
        </Link>
      </div>

      {erro && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">{erro}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Telefone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3">Carregando...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Nenhum técnico encontrado
                </td>
              </tr>
            ) : (
              items.map((tec) => (
                <tr key={tec.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/tecnicos/${tec.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {tec.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{tec.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-900">{tec.telefone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tec.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tec.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link
                      href={`/dashboard/tecnicos/${tec.id}/editar`}
                      className="text-gray-700 hover:text-gray-900 font-medium"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => onRemove(tec.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
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
  );
}
