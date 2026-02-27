'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Manutencao } from '@/types/manutencao';
import ManutencaoForm from '../../_Form';
import Link from 'next/link';

export default function EditarManutencaoPage() {
  const params = useParams();
  const manutencaoId = Number(params.id);

  const [manutencao, setManutencao] = useState<Manutencao | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    loadManutencao();
  }, [manutencaoId]);

  async function loadManutencao() {
    try {
      setLoading(true);
      setErro(null);
      const data = await api<Manutencao>(`/manutencoes/${manutencaoId}/`);
      setManutencao(data);
    } catch (e: any) {
      console.error('Erro ao carregar manutenção:', e);
      setErro(e.message || 'Erro ao carregar manutenção');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando manutenção...</p>
        </div>
      </div>
    );
  }

  if (erro || !manutencao) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <p className="text-red-800">{erro || 'Manutenção não encontrada'}</p>
          <Link
            href="/dashboard/manutencoes"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            Voltar para lista de manutenções
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Editar Manutenção #{manutencao.id}</h1>
        <Link
          href={`/dashboard/manutencoes/${manutencaoId}`}
          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
      </div>
      <ManutencaoForm mode="edit" id={manutencaoId} initial={manutencao} />
    </div>
  );
}
