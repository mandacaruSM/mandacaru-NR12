'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { almoxarifadoApi, type MovimentoEstoque } from '@/lib/api';

export default function MovimentosPage() {
  const [items, setItems] = useState<MovimentoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    loadMovimentos();
  }, [filtroTipo]);

  async function loadMovimentos() {
    try {
      setLoading(true);
      const data = await almoxarifadoApi.movimentos.list({
        tipo: filtroTipo || undefined,
      });
      setItems(data.results || []);
    } catch (e: any) {
      console.error('Erro:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function formatarDataHora(data: string) {
    return new Date(data).toLocaleString('pt-BR');
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Movimentos de Estoque</h1>
        <div className="flex gap-3">
          <Link href="/dashboard/almoxarifado" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Voltar
          </Link>
          <Link href="/dashboard/almoxarifado/movimentos/novo" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            + Novo Movimento
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
        >
          <option value="" className="text-gray-700 bg-white">Todos os tipos</option>
          <option value="ENTRADA" className="text-black bg-white">Entrada</option>
          <option value="SAIDA" className="text-black bg-white">Saída</option>
          <option value="AJUSTE" className="text-black bg-white">Ajuste</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{formatarDataHora(item.data_hora)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' :
                    item.tipo === 'SAIDA' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.tipo_display}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="font-medium">{item.produto_codigo}</div>
                  <div className="text-gray-600">{item.produto_nome}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.local_nome}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{parseFloat(item.quantidade).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.documento || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
