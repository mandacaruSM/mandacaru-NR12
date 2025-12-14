// frontend/src/app/dashboard/supervisores/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supervisoresApi, Supervisor } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function SupervisoresPage() {
  const toast = useToast();
  const [items, setItems] = useState<Supervisor[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await supervisoresApi.list({ q });
      setItems(data.results);
      setCount(data.count);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao listar supervisores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const onRemove = async (id: number) => {
    if (!confirm('Excluir este supervisor?')) return;
    try {
      await supervisoresApi.remove(id);
      toast.success('Supervisor removido');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao remover');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervisores 🧑‍💼</h1>
          <p className="text-gray-600">Total: {count}</p>
        </div>
        <Link
          href="/dashboard/supervisores/novo"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Novo Supervisor
        </Link>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome/CPF/telefone"
          className="w-full max-w-md px-3 py-2 border rounded-lg text-gray-900"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-800 text-white rounded-lg"
        >
          Buscar
        </button>
      </form>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Nome</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">CPF</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Telefone</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Ativo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-900">
                  Carregando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-900">
                  Nenhum supervisor encontrado
                </td>
              </tr>
            ) : (
              items.map((sp) => (
                <tr key={sp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/supervisores/${sp.id}`} className="text-blue-600 hover:underline">
                      {sp.nome_completo}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-900">{sp.cpf}</td>
                  <td className="px-4 py-2 text-gray-900">{sp.telefone || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${sp.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {sp.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <Link href={`/dashboard/supervisores/${sp.id}/editar`} className="text-gray-900 hover:text-blue-600">
                      Editar
                    </Link>
                    <button
                      onClick={() => onRemove(sp.id)}
                      className="text-red-600 hover:text-red-800"
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
