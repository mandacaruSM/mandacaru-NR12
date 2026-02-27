'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Manutencao } from '@/types/manutencao';
import { useToast } from '@/contexts/ToastContext';

export default function VisualizarManutencaoPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
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

  async function excluir() {
    if (!confirm('Tem certeza que deseja excluir esta manutenção?')) return;

    try {
      const res = await fetch(`/api/proxy/manutencoes/${manutencaoId}/`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || res.statusText);
      }

      toast?.success('Manutenção excluída com sucesso!');
      router.push('/dashboard/manutencoes');
    } catch (e: any) {
      console.error('Erro ao excluir manutenção:', e);
      toast?.error(e.message || 'Erro ao excluir manutenção');
    }
  }

  function formatarData(data: string) {
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return data;
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/manutencoes" className="hover:text-blue-600">
          Manutenções
        </Link>
        <span>/</span>
        <span className="text-gray-900">#{manutencao.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manutenção #{manutencao.id}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              manutencao.tipo === 'preventiva'
                ? 'bg-blue-100 text-blue-800'
                : manutencao.tipo === 'corretiva'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {manutencao.tipo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/manutencoes/${manutencaoId}/editar`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Editar
          </Link>
          <button
            onClick={excluir}
            className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Informações Principais */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Equipamento
            </label>
            <p className="text-base text-gray-900 font-medium">
              {manutencao.equipamento_nome || `#${manutencao.equipamento}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Data
            </label>
            <p className="text-base text-gray-900">
              {formatarData(manutencao.data)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Horímetro/KM
            </label>
            <p className="text-base text-gray-900">
              {manutencao.horimetro}
            </p>
          </div>

          {manutencao.tecnico_nome && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Técnico Responsável
              </label>
              <p className="text-base text-gray-900">
                {manutencao.tecnico_nome}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Descrição */}
      {manutencao.descricao && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
          <p className="text-gray-900 whitespace-pre-wrap">
            {manutencao.descricao}
          </p>
        </div>
      )}

      {/* Observações */}
      {manutencao.observacoes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
          <p className="text-gray-900 whitespace-pre-wrap">
            {manutencao.observacoes}
          </p>
        </div>
      )}

      {/* Próxima Manutenção */}
      {manutencao.proxima_manutencao && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Próxima Manutenção</h2>
          <p className="text-gray-900 whitespace-pre-wrap">
            {manutencao.proxima_manutencao}
          </p>
        </div>
      )}

      {/* Informações de Auditoria */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Criado em:</span>
            <span className="ml-2 text-gray-900">
              {manutencao.created_at ? new Date(manutencao.created_at).toLocaleString('pt-BR') : '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Atualizado em:</span>
            <span className="ml-2 text-gray-900">
              {manutencao.updated_at ? new Date(manutencao.updated_at).toLocaleString('pt-BR') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Botão Voltar */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/manutencoes"
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}
