// frontend/src/app/dashboard/operadores/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { operadoresApi, Operador } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function OperadoresPage() {
  const toast = useToast();
  const [items, setItems] = useState<Operador[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await operadoresApi.list({ q });
      setItems(data.results);
      setCount(data.count);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao listar operadores');
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
    if (!confirm('Excluir este operador?')) return;
    try {
      await operadoresApi.remove(id);
      toast.success('Operador removido');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao remover');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operadores 👷</h1>
          <p className="text-gray-900">Total: {count}</p>
        </div>
        <Link
          href="/dashboard/operadores/novo"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Novo Operador
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
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Telegram</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Ativo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-900">
                  Carregando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-900">
                  Nenhum operador encontrado
                </td>
              </tr>
            ) : (
              items.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/operadores/${op.id}`} className="text-blue-600 hover:underline">
                      {op.nome_completo}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-900">{op.cpf}</td>
                  <td className="px-4 py-2 text-gray-900">{op.telefone || '-'}</td>
                  <td className="px-4 py-2">
                    {(op as any).telegram_chat_id ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ {(op as any).telegram_chat_id}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
                        Não vinculado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${op.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {op.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <Link href={`/dashboard/operadores/${op.id}/editar`} className="text-gray-900 hover:text-blue-600">
                      Editar
                    </Link>
                    <button
                      onClick={() => onRemove(op.id)}
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
