// frontend/src/app/dashboard/equipamento/[uuid]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import {
  equipamentosApi,
  abastecimentosApi,
  nr12Api,
  Equipamento,
  Abastecimento,
  ChecklistRealizado
} from '@/lib/api';
import type { Manutencao } from '@/types/manutencao';

interface PageProps {
  params: Promise<{ uuid: string }>;
}

export default function EquipamentoResumePage({ params }: PageProps) {
  const { uuid } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const userRole = user?.profile?.role;

  const [loading, setLoading] = useState(true);
  const [equipamento, setEquipamento] = useState<Equipamento | null>(null);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRealizado[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uuid) {
      loadEquipamentoData();
    }
  }, [uuid]);

  const loadEquipamentoData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar equipamento pelo UUID (filtro direto)
      const equipamentosRes = await api<{ results: Equipamento[] }>(`/equipamentos/equipamentos/?uuid=${uuid}`);
      const equipamentos = equipamentosRes.results || [];
      const equip = equipamentos.length > 0 ? equipamentos[0] : null;

      if (!equip) {
        setError('Equipamento não encontrado');
        setLoading(false);
        return;
      }

      setEquipamento(equip);

      // Carregar dados relacionados em paralelo
      const [manutencoesRes, abastecimentosRes, checklistsRes] = await Promise.all([
        api<any>(`/manutencoes/?equipamento=${equip.id}`).catch(() => ({ results: [] })),
        abastecimentosApi.list({ equipamento: equip.id }).catch(() => ({ results: [] })),
        nr12Api.checklists.list({ equipamento: equip.id }).catch(() => ({ results: [] })),
      ]);

      // Manutenções podem vir como array ou objeto com results
      const manutencoesArray = Array.isArray(manutencoesRes) ? manutencoesRes : (manutencoesRes.results || []);
      setManutencoes(manutencoesArray.slice(0, 5));
      setAbastecimentos((abastecimentosRes.results || []).slice(0, 5));
      setChecklists((checklistsRes.results || []).slice(0, 5));

    } catch (err: any) {
      console.error('Erro ao carregar equipamento:', err);
      setError(err.message || 'Erro ao carregar dados do equipamento');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Carregando equipamento...</p>
        </div>
      </div>
    );
  }

  if (error || !equipamento) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Equipamento não encontrado</h2>
          <p className="text-gray-500 mb-4">{error || 'O QR Code lido não corresponde a nenhum equipamento cadastrado.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header do Equipamento */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Equipamento</h1>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🚜</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{equipamento.codigo}</h2>
              <p className="text-blue-100">{equipamento.descricao || `${equipamento.fabricante} ${equipamento.modelo}`}</p>
              <p className="text-blue-200 text-sm mt-1">{equipamento.tipo_nome}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Informacoes Principais */}
      <div className="p-4 space-y-4">
        {/* Leitura Atual */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">
                {equipamento.tipo_medicao === 'HORA' ? 'Horímetro Atual' : 'Quilometragem Atual'}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {Number(equipamento.leitura_atual).toLocaleString('pt-BR')}
                <span className="text-lg font-normal text-gray-500 ml-1">
                  {equipamento.tipo_medicao === 'HORA' ? 'h' : 'km'}
                </span>
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              equipamento.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {equipamento.ativo ? 'Ativo' : 'Inativo'}
            </div>
          </div>
        </div>

        {/* Informacoes do Local */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Localização</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente</span>
              <span className="font-medium text-gray-900">{equipamento.cliente_nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Empreendimento</span>
              <span className="font-medium text-gray-900">{equipamento.empreendimento_nome}</span>
            </div>
          </div>
        </div>

        {/* Ultimas Manutencoes */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Últimas Manutenções</h3>
            <span className="text-xs text-gray-500">{manutencoes.length} registros</span>
          </div>
          {manutencoes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Nenhuma manutenção registrada</p>
          ) : (
            <div className="space-y-2">
              {manutencoes.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {m.tipo === 'preventiva' ? '🔧 Preventiva' : '🛠️ Corretiva'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(m.data)}</p>
                  </div>
                  <span className="text-sm text-gray-600">{Number(m.horimetro).toLocaleString('pt-BR')} h</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ultimos Abastecimentos */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Últimos Abastecimentos</h3>
            <span className="text-xs text-gray-500">{abastecimentos.length} registros</span>
          </div>
          {abastecimentos.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Nenhum abastecimento registrado</p>
          ) : (
            <div className="space-y-2">
              {abastecimentos.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">⛽ {a.quantidade_litros}L</p>
                    <p className="text-xs text-gray-500">{formatDate(a.data)}</p>
                  </div>
                  <span className="text-sm text-gray-600">R$ {Number(a.valor_total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ultimos Checklists */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Últimos Checklists NR12</h3>
            <span className="text-xs text-gray-500">{checklists.length} registros</span>
          </div>
          {checklists.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Nenhum checklist realizado</p>
          ) : (
            <div className="space-y-2">
              {checklists.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {c.resultado_geral === 'APROVADO' ? '✅' : c.resultado_geral === 'REPROVADO' ? '❌' : '📋'} {c.modelo_nome}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateTime(c.criado_em)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.resultado_geral === 'APROVADO' ? 'bg-green-100 text-green-800' :
                    c.resultado_geral === 'REPROVADO' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {c.status === 'CONCLUIDO' ? c.resultado_geral || 'Concluído' : c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botoes de Acao Fixos */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className={`grid ${userRole === 'OPERADOR' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 max-w-lg mx-auto`}>
          <Link
            href={`/dashboard/abastecimentos/novo?equipamento=${equipamento.id}&codigo=${equipamento.codigo}&leitura=${equipamento.leitura_atual}&tipo_medicao=${equipamento.tipo_medicao}`}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            <span className="text-xl">⛽</span>
            Abastecimento
          </Link>
          <Link
            href={`/dashboard/nr12/checklists/novo?equipamento=${equipamento.id}&tipo=${equipamento.tipo}`}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
          >
            <span className="text-xl">📋</span>
            Checklist
          </Link>
          {userRole === 'OPERADOR' ? (
            <Link
              href={`/dashboard/manutencoes/novo?equipamento=${equipamento.id}&codigo=${equipamento.codigo}&leitura=${equipamento.leitura_atual}&tipo=corretiva`}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
            >
              <span className="text-xl">🛠️</span>
              Manutencao
            </Link>
          ) : (
            <>
              <Link
                href={`/dashboard/manutencoes/novo?equipamento=${equipamento.id}&codigo=${equipamento.codigo}&leitura=${equipamento.leitura_atual}&tipo=preventiva`}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                <span className="text-xl">🔧</span>
                Preventiva
              </Link>
              <Link
                href={`/dashboard/manutencoes/novo?equipamento=${equipamento.id}&codigo=${equipamento.codigo}&leitura=${equipamento.leitura_atual}&tipo=corretiva`}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                <span className="text-xl">🛠️</span>
                Corretiva
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
