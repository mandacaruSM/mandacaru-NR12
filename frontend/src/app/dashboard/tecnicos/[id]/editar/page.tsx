'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import TecnicoForm from '../../_Form';

interface Tecnico {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
}

export default function EditarTecnicoPage() {
  const params = useParams();
  const id = Number(params.id);

  const [item, setItem] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErro(null);
      const data = await api<Tecnico>(`/tecnicos/${id}/`);
      setItem(data);
    } catch (e: any) {
      console.error('Erro ao carregar técnico:', e);
      setErro(e.message || 'Erro ao carregar técnico');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando...</span>
      </div>
    );
  }

  if (erro || !item) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">{erro || 'Técnico não encontrado'}</p>
        </div>
        <Link
          href="/dashboard/tecnicos"
          className="inline-block px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Editar Técnico 👨‍🔧</h1>
      </div>

      <TecnicoForm mode="edit" id={id} initial={item} />
    </div>
  );
}
