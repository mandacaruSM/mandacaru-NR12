// frontend/src/app/dashboard/nr12/checklists/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { nr12Api, type ChecklistRealizado, type RespostaItemChecklist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const STATUS_LABELS = {
  'EM_ANDAMENTO': 'Em Andamento',
  'CONCLUIDO': 'Concluído',
  'CANCELADO': 'Cancelado',
};

const STATUS_COLORS = {
  'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
  'CONCLUIDO': 'bg-green-100 text-green-800',
  'CANCELADO': 'bg-gray-100 text-gray-800',
};

const RESULTADO_LABELS = {
  'APROVADO': 'Aprovado',
  'APROVADO_RESTRICAO': 'Aprovado com Restrição',
  'REPROVADO': 'Reprovado',
};

const RESULTADO_COLORS = {
  'APROVADO': 'bg-green-100 text-green-800 border-green-200',
  'APROVADO_RESTRICAO': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'REPROVADO': 'bg-red-100 text-red-800 border-red-200',
};

const RESPOSTA_LABELS: Record<string, string> = {
  'CONFORME': '✅ Conforme',
  'NAO_CONFORME': '❌ Não Conforme',
  'SIM': '✅ Sim',
  'NAO': '❌ Não',
  'NA': '➖ N/A',
};

const RESPOSTA_COLORS: Record<string, string> = {
  'CONFORME': 'text-green-600',
  'NAO_CONFORME': 'text-red-600',
  'SIM': 'text-green-600',
  'NAO': 'text-red-600',
  'NA': 'text-gray-500',
};

const CATEGORIA_LABELS: Record<string, string> = {
  'VISUAL': '👁️ Visual',
  'FUNCIONAL': '⚙️ Funcional',
  'MEDICAO': '📏 Medição',
  'LIMPEZA': '🧹 Limpeza',
  'LUBRIFICACAO': '🛢️ Lubrificação',
  'DOCUMENTACAO': '📄 Documentação',
  'SEGURANCA': '🔒 Segurança',
  'OUTROS': '📋 Outros',
};

export default function ChecklistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const checklistId = Number(params.id);

  const [checklist, setChecklist] = useState<ChecklistRealizado & { respostas: RespostaItemChecklist[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, [checklistId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const data = await nr12Api.checklists.get(checklistId);
      setChecklist(data);
    } catch (err: any) {
      toast.error('Erro ao carregar checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizar = async () => {
    if (!confirm('Deseja finalizar este checklist?')) return;

    const observacoes = prompt('Observações gerais (opcional):');

    try {
      await nr12Api.checklists.finalizar(checklistId, observacoes || undefined);
      toast.success('Checklist finalizado com sucesso!');
      loadChecklist();
    } catch (err: any) {
      toast.error('Erro ao finalizar checklist');
    }
  };

  const handleCancelar = async () => {
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;

    try {
      await nr12Api.checklists.cancelar(checklistId, motivo);
      toast.success('Checklist cancelado com sucesso!');
      loadChecklist();
    } catch (err: any) {
      toast.error('Erro ao cancelar checklist');
    }
  };

  const formatData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando checklist...</p>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Checklist não encontrado</p>
        <Link href="/dashboard/nr12/checklists" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista de checklists
        </Link>
      </div>
    );
  }

  const respostasAgrupadas = checklist.respostas.reduce((acc, resposta) => {
    const categoria = resposta.item_categoria;
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(resposta);
    return acc;
  }, {} as Record<string, RespostaItemChecklist[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/dashboard/nr12" className="hover:text-blue-600">
                NR12
              </Link>
              <span>/</span>
              <Link href="/dashboard/nr12/checklists" className="hover:text-blue-600">
                Checklists
              </Link>
              <span>/</span>
              <span>#{checklist.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Checklist #{checklist.id}
            </h1>
            <p className="text-gray-600 mt-1">{checklist.modelo_nome}</p>
          </div>
          <div className="flex items-center gap-3">
            {checklist.status === 'EM_ANDAMENTO' && (
              <>
                <button
                  onClick={handleFinalizar}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✓ Finalizar
                </button>
                <button
                  onClick={handleCancelar}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  ✕ Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status e Resultado */}
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[checklist.status]}`}>
            {STATUS_LABELS[checklist.status]}
          </span>
          {checklist.resultado_geral && (
            <span className={`px-3 py-1 text-sm font-semibold rounded-lg border-2 ${RESULTADO_COLORS[checklist.resultado_geral]}`}>
              {RESULTADO_LABELS[checklist.resultado_geral]}
            </span>
          )}
        </div>
      </div>

      {/* Informações do Checklist */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Equipamento</p>
            <p className="text-base font-medium text-gray-900">
              {checklist.equipamento_codigo}
            </p>
            <p className="text-sm text-gray-500">{checklist.equipamento_descricao}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Operador</p>
            <p className="text-base font-medium text-gray-900">
              {checklist.operador_nome || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Origem</p>
            <p className="text-base font-medium text-gray-900">
              {checklist.origem === 'WEB' ? '💻 Web' : checklist.origem === 'BOT' ? '🤖 Telegram' : '📱 Mobile'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Data/Hora Início</p>
            <p className="text-base font-medium text-gray-900">
              {formatData(checklist.data_hora_inicio)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Data/Hora Fim</p>
            <p className="text-base font-medium text-gray-900">
              {checklist.data_hora_fim ? formatData(checklist.data_hora_fim) : 'Em andamento'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Leitura do Equipamento</p>
            <p className="text-base font-medium text-gray-900">
              {checklist.leitura_equipamento || '-'}
            </p>
          </div>
        </div>

        {checklist.observacoes_gerais && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Observações Gerais</p>
            <p className="text-sm text-gray-900">{checklist.observacoes_gerais}</p>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Respostas</p>
              <p className="text-3xl font-bold text-gray-900">{checklist.total_respostas}</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Não Conformidades</p>
              <p className="text-3xl font-bold text-red-600">{checklist.total_nao_conformidades}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Conformidade</p>
              <p className="text-3xl font-bold text-green-600">
                {checklist.total_respostas > 0 
                  ? Math.round(((checklist.total_respostas - checklist.total_nao_conformidades) / checklist.total_respostas) * 100)
                  : 0}%
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* Respostas por Categoria */}
      <div className="space-y-4">
        {Object.entries(respostasAgrupadas).map(([categoria, respostas]) => (
          <div key={categoria} className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {CATEGORIA_LABELS[categoria] || categoria}
              </h3>
              <p className="text-sm text-gray-600">{respostas.length} item(ns)</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {respostas.map((resposta) => (
                  <div 
                    key={resposta.id} 
                    className={`p-4 rounded-lg border-2 ${
                      resposta.resposta === 'NAO_CONFORME' || resposta.resposta === 'NAO'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">
                          {resposta.item_pergunta}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`font-semibold ${RESPOSTA_COLORS[resposta.resposta || '']}`}>
                            {RESPOSTA_LABELS[resposta.resposta || ''] || resposta.resposta}
                          </span>
                          {resposta.valor_numerico && (
                            <span className="text-gray-600">
                              📏 {resposta.valor_numerico}
                            </span>
                          )}
                          {resposta.valor_texto && (
                            <span className="text-gray-600">
                              💬 {resposta.valor_texto}
                            </span>
                          )}
                        </div>
                        {resposta.observacao && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Observação:</span> {resposta.observacao}
                            </p>
                          </div>
                        )}
                        {resposta.foto && (
                          <div className="mt-3">
                            <img 
                              src={resposta.foto} 
                              alt="Evidência" 
                              className="max-w-md rounded-lg border-2 border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                        {formatData(resposta.data_hora_resposta)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {checklist.respostas.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">📋 Nenhuma resposta registrada ainda</p>
        </div>
      )}
    </div>
  );
}