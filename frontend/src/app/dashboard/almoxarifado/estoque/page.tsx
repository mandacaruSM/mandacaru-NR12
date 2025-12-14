'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { almoxarifadoApi, type Estoque } from '@/lib/api';

export default function EstoquePage() {
  const [items, setItems] = useState<Estoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroComSaldo, setFiltroComSaldo] = useState(false);

  useEffect(() => {
    loadEstoque();
  }, [filtroComSaldo]);

  async function loadEstoque() {
    try {
      setLoading(true);
      const data = await almoxarifadoApi.estoque.list({
        apenas_com_saldo: filtroComSaldo || undefined,
      });
      setItems(data.results || []);
    } catch (e: any) {
      console.error('Erro:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
        <Link href="/dashboard/almoxarifado" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
          Voltar
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filtroComSaldo}
            onChange={(e) => setFiltroComSaldo(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-900">Apenas itens com saldo</span>
        </label>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.produto_codigo}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.produto_nome}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.local_nome}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`font-medium ${parseFloat(item.saldo) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(item.saldo).toFixed(2)} {item.unidade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
