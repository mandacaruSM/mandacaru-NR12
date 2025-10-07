'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { nr12Api, ChecklistRealizado } from '@/lib/api';

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<ChecklistRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  useEffect(() => {
    loadChecklists();
  }, [filtroStatus]);

  const loadChecklists = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filtroStatus) params.status = filtroStatus;
      
      const data = await nr12Api.checklists.list(params);
      setChecklists(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checklists');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este checklist?')) return;

    try {
      await nr12Api.checklists.delete(id);
      setChecklists(checklists.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      em_andamento: 'bg-blue-100 text-blue-800',
      concluido: 'bg-green-100 text-green-800',
      aprovado: 'bg-emerald-100 text-emerald-800',
      reprovado: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      em_andamento: 'Em Andamento',
      concluido: 'Concluído',
      aprovado: 'Aprovado',
      reprovado: 'Reprovado',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checklists NR12</h1>
          <p className="text-gray-600 mt-1">Gerenciar inspeções realizadas</p>
        </div>
        <Link
          href="/dashboard/nr12/checklists/novo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Nova Inspeção
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Filtrar por Status:</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
          </select>
        </div>
      </div>

      {checklists.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">Nenhum checklist encontrado</p>
          <Link
            href="/dashboard/nr12/checklists/novo"
            className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
          >
            Realizar primeira inspeção
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspetor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checklists.map((checklist) => (
                <tr key={checklist.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(checklist.data_inspecao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {checklist.equipamento_tag || `ID ${checklist.equipamento}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {checklist.modelo_checklist_nome || `Modelo ${checklist.modelo_checklist}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {checklist.inspetor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(checklist.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/dashboard/nr12/checklists/${checklist.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Ver
                    </Link>
                    {checklist.status === 'em_andamento' && (
                      <Link
                        href={`/dashboard/nr12/checklists/${checklist.id}/editar`}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Editar
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(checklist.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        Total de {checklists.length} checklist(s) encontrado(s)
      </div>
    </div>
  );
}