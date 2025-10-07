'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { checklistsNR12Api, ChecklistRealizado } from '@/lib/api';

export default function ChecklistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const checklistId = Number(params.id);

  const [checklist, setChecklist] = useState<ChecklistRealizado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (checklistId) {
      loadChecklist();
    }
  }, [checklistId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const data = await checklistsNR12Api.get(checklistId);
      setChecklist(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizar = async () => {
    if (!confirm('Tem certeza que deseja finalizar este checklist?')) return;

    try {
      await checklistsNR12Api.finalizar(checklistId);
      alert('Checklist finalizado com sucesso!');
      loadChecklist();
    } catch (err: any) {
      alert('Erro ao finalizar: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este checklist?')) return;

    try {
      await checklistsNR12Api.delete(checklistId);
      alert('Checklist excluído com sucesso!');
      router.push('/dashboard/nr12/checklists');
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
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getRespostaBadge = (resposta: string) => {
    const badges: Record<string, { bg: string; icon: string; label: string }> = {
      conforme: { bg: 'bg-green-100 text-green-800', icon: '✓', label: 'Conforme' },
      nao_conforme: { bg: 'bg-red-100 text-red-800', icon: '✗', label: 'Não Conforme' },
      nao_aplicavel: { bg: 'bg-gray-100 text-gray-800', icon: '—', label: 'Não Aplicável' },
    };

    const config = badges[resposta];
    if (!config) {
      return <span className="text-sm text-gray-600">{resposta}</span>;
    }

    return (
      <span className={`px-2 py-1 rounded text-sm font-medium ${config.bg}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Checklist não encontrado'}
        </div>
        <Link
          href="/dashboard/nr12/checklists"
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          ← Voltar para lista
        </Link>
      </div>
    );
  }

  // Calcula estatísticas
  const totalItens = checklist.respostas.length;
  const conformes = checklist.respostas.filter(r => r.resposta === 'conforme').length;
  const naoConformes = checklist.respostas.filter(r => r.resposta === 'nao_conforme').length;
  const naoAplicaveis = checklist.respostas.filter(r => r.resposta === 'nao_aplicavel').length;
  const percentualConformidade = totalItens > 0 ? Math.round((conformes / (totalItens - naoAplicaveis)) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checklist NR12 #{checklist.id}</h1>
          <p className="text-gray-600 mt-1">
            {checklist.modelo_checklist_nome} - {checklist.equipamento_tag || `Equipamento ${checklist.equipamento}`}
          </p>
        </div>
        <div className="flex gap-2">
          {checklist.status === 'em_andamento' && (
            <>
              <button
                onClick={handleFinalizar}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Finalizar
              </button>
              <Link
                href={`/dashboard/nr12/checklists/${checklist.id}/editar`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Editar
              </Link>
            </>
          )}
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Informações Gerais */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações da Inspeção</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">{getStatusBadge(checklist.status)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Data da Inspeção</label>
            <p className="mt-1 text-gray-900">{new Date(checklist.data_inspecao).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Inspetor</label>
            <p className="mt-1 text-gray-900">{checklist.inspetor}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Criado em</label>
            <p className="mt-1 text-gray-900">{new Date(checklist.created_at).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {checklist.observacoes_gerais && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-500">Observações Gerais</label>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{checklist.observacoes_gerais}</p>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-blue-600">{totalItens}</div>
          <div className="text-sm text-gray-600">Total de Itens</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-green-600">{conformes}</div>
          <div className="text-sm text-gray-600">Conformes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-red-600">{naoConformes}</div>
          <div className="text-sm text-gray-600">Não Conformes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-purple-600">{percentualConformidade}%</div>
          <div className="text-sm text-gray-600">Conformidade</div>
        </div>
      </div>

      {/* Respostas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Respostas do Checklist</h2>
        
        <div className="space-y-4">
          {checklist.respostas.map((resposta, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mr-2">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">Item {resposta.item_checklist}</p>
                      {resposta.observacao && (
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Obs:</strong> {resposta.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  {getRespostaBadge(resposta.resposta)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="mt-6 flex justify-between">
        <Link
          href="/dashboard/nr12/checklists"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Voltar para lista
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
        >
          🖨️ Imprimir
        </button>
      </div>
    </div>
  );
}