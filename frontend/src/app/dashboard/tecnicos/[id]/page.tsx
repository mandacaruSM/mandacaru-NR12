'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Tecnico {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
  created_at?: string;
}

export default function TecnicoDetailPage() {
  const params = useParams();
  const router = useRouter();
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

  const onRemove = async () => {
    if (!confirm('Excluir este técnico?')) return;
    try {
      await api(`/tecnicos/${id}/`, { method: 'DELETE' });
      router.push('/dashboard/tecnicos');
    } catch (e: any) {
      alert(e.message || 'Falha ao remover');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Técnico 👨‍🔧</h1>
          <p className="text-gray-600 mt-1">{item.nome}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/tecnicos/${id}/editar`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Editar
          </Link>
          <button
            onClick={onRemove}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Nome</p>
            <p className="text-gray-700">{item.nome}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Email</p>
            <p className="text-gray-700">{item.email || '-'}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Telefone</p>
            <p className="text-gray-700">{item.telefone || '-'}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Status</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {item.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {item.created_at && (
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-gray-900 mb-1">Data de Cadastro</p>
              <p className="text-gray-700">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
            </div>
          )}
        </div>
      </div>

      <Link
        href="/dashboard/tecnicos"
        className="inline-block px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
      >
        Voltar para Lista
      </Link>
    </div>
  );
}
