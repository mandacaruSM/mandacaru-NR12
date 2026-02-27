// frontend/src/app/dashboard/equipamentos/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { equipamentosApi, Equipamento } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import QRCodeModal from '@/components/QRCodeModal';

export default function VisualizarEquipamentoPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const equipamentoId = Number(params.id);

  const [equipamento, setEquipamento] = useState<Equipamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const isCliente = user?.profile?.role === 'CLIENTE';

  useEffect(() => {
    loadEquipamento();
  }, [equipamentoId]);

  const loadEquipamento = async () => {
    try {
      setLoading(true);
      const data = await equipamentosApi.get(equipamentoId);
      setEquipamento(data);
    } catch (err: any) {
      toast.error('Erro ao carregar equipamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
    try {
      await equipamentosApi.delete(equipamentoId);
      toast.success('Equipamento excluído com sucesso!');
      router.push('/dashboard/equipamentos');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir equipamento');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando equipamento...</p>
        </div>
      </div>
    );
  }

  if (!equipamento) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Equipamento não encontrado</p>
        <Link href="/dashboard/equipamentos" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista de equipamentos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard/equipamentos" className="hover:text-blue-600">
            Equipamentos
          </Link>
          <span>/</span>
          <span className="text-gray-900">{equipamento.codigo}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {equipamento.codigo}
              {equipamento.descricao && (
                <span className="text-gray-500 font-normal"> - {equipamento.descricao}</span>
              )}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                equipamento.ativo
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {equipamento.ativo ? 'Ativo' : 'Inativo'}
              </span>
              <span className="text-sm text-gray-500">
                {equipamento.tipo_nome}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQrModalOpen(true)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              title="Ver QR Code"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            {!isCliente && (
              <>
                <Link
                  href={`/dashboard/equipamentos/${equipamentoId}/manutencao`}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Itens de Manutenção
                </Link>
                <Link
                  href={`/dashboard/equipamentos/${equipamentoId}/editar`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Editar
                </Link>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                >
                  Excluir
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cards de informacao */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Leitura Atual - Card destacado */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 mb-1">Leitura Atual</p>
          <p className="text-3xl font-bold text-gray-900">
            {Number(equipamento.leitura_atual).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {equipamento.tipo_medicao === 'KM' ? 'quilômetros' : 'horas'}
          </p>
        </div>

        {/* Tipo de Medicao */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500 mb-1">Tipo de Medição</p>
          <p className="text-xl font-semibold text-gray-900">
            {equipamento.tipo_medicao === 'KM' ? 'Quilômetro' : 'Horímetro'}
          </p>
        </div>

        {/* UUID */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400">
          <p className="text-sm text-gray-500 mb-1">UUID</p>
          <p className="text-sm font-mono text-gray-700 break-all">{equipamento.uuid}</p>
        </div>
      </div>

      {/* Secoes de detalhe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Localização */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Localização</h2>
          </div>
          <div className="p-6 space-y-4">
            <InfoRow label="Cliente" value={equipamento.cliente_nome} />
            <InfoRow label="Empreendimento" value={equipamento.empreendimento_nome} />
          </div>
        </div>

        {/* Identificação */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Identificação</h2>
          </div>
          <div className="p-6 space-y-4">
            <InfoRow label="Código" value={equipamento.codigo} />
            <InfoRow label="Tipo" value={equipamento.tipo_nome} />
            <InfoRow label="Descrição" value={equipamento.descricao || '-'} />
          </div>
        </div>

        {/* Dados Técnicos */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Dados Técnicos</h2>
          </div>
          <div className="p-6 space-y-4">
            <InfoRow label="Fabricante" value={equipamento.fabricante || '-'} />
            <InfoRow label="Modelo" value={equipamento.modelo || '-'} />
            <InfoRow label="Ano de Fabricação" value={equipamento.ano_fabricacao?.toString() || '-'} />
            <InfoRow label="Número de Série" value={equipamento.numero_serie || '-'} />
          </div>
        </div>

        {/* Controle */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Controle</h2>
          </div>
          <div className="p-6 space-y-4">
            <InfoRow label="Status" value={equipamento.ativo ? 'Ativo' : 'Inativo'} />
            <InfoRow
              label="Cadastrado em"
              value={new Date(equipamento.criado_em).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            />
            <InfoRow
              label="Última atualização"
              value={new Date(equipamento.atualizado_em).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            />
          </div>
        </div>

        {/* Consumo de Combustível */}
        {(equipamento.consumo_nominal_L_h || equipamento.consumo_nominal_km_L || (equipamento as any).consumo_medio) && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Consumo de Combustível</h2>
            </div>
            <div className="p-6 space-y-4">
              {equipamento.consumo_nominal_L_h && (
                <InfoRow
                  label="Consumo Nominal (L/h)"
                  value={`${Number(equipamento.consumo_nominal_L_h).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} litros/hora`}
                />
              )}
              {equipamento.consumo_nominal_km_L && (
                <InfoRow
                  label="Consumo Nominal (km/L)"
                  value={`${Number(equipamento.consumo_nominal_km_L).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/litro`}
                />
              )}
              {(equipamento as any).consumo_medio && (
                <div className="pt-2 border-t border-gray-200">
                  <InfoRow
                    label={`Consumo Médio Real (${equipamento.tipo_medicao === 'HORIMETRO' ? 'L/h' : 'km/L'})`}
                    value={
                      <span className="text-blue-600 font-semibold">
                        {Number((equipamento as any).consumo_medio).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {equipamento.tipo_medicao === 'HORIMETRO' ? 'litros/hora' : 'km/litro'}
                      </span>
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculado automaticamente baseado nos abastecimentos
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        equipamentoUuid={equipamento.uuid}
        equipamentoCodigo={equipamento.codigo}
        equipamentoDescricao={equipamento.descricao}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}
