'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fioDiamantadoApi, FioDiamantado, RegistroCorte, HistoricoDesgaste, FioDiamantadoMetricas } from '@/lib/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetalheFioDiamantadoPage({ params }: PageProps) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [fio, setFio] = useState<(FioDiamantado & { metricas?: FioDiamantadoMetricas }) | null>(null);
  const [historico, setHistorico] = useState<HistoricoDesgaste[]>([]);
  const [cortes, setCortes] = useState<RegistroCorte[]>([]);
  const [custos, setCustos] = useState<{
    diesel: { area_total_m2: number; consumo_litros: number; tempo_horas: number; custo_total: number };
    rede_eletrica: { area_total_m2: number; tempo_horas: number; custo_estimado: number };
  } | null>(null);
  const [alertas, setAlertas] = useState<Array<{ tipo: string; mensagem: string }>>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [dashboardRes, cortesRes] = await Promise.all([
        fioDiamantadoApi.fios.dashboard(parseInt(id)),
        fioDiamantadoApi.cortes.list({ fio: parseInt(id) }),
      ]);

      setFio(dashboardRes.fio);
      setHistorico(dashboardRes.historico_desgaste);
      setCustos(dashboardRes.custos_por_fonte);
      setAlertas(dashboardRes.alertas);
      setCortes(cortesRes.results || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'ATIVO':
        return 'bg-green-100 text-green-800';
      case 'FINALIZADO':
        return 'bg-gray-100 text-gray-800';
      case 'MANUTENCAO':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getVidaUtilColor(percentual: number) {
    if (percentual <= 20) return 'bg-red-500';
    if (percentual <= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!fio) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Fio nao encontrado</p>
        <Link href="/dashboard/fio-diamantado" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Voltar
        </Link>
      </div>
    );
  }

  // Calcular max e min para o grafico
  const maxDiametro = Math.max(...historico.map(h => h.diametro_mm), fio.diametro_inicial_mm);
  const minDiametro = Math.min(fio.diametro_minimo_mm, ...historico.map(h => h.diametro_mm));
  const range = maxDiametro - minDiametro;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/fio-diamantado" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
            &larr; Voltar
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{fio.codigo}</h1>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(fio.status)}`}>
              {fio.status_display || fio.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{fio.fabricante} {fio.numero_serie && `- ${fio.numero_serie}`}</p>
        </div>
        <Link
          href={`/dashboard/fio-diamantado/cortes/novo?fio=${id}`}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          Registrar Corte
        </Link>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg flex items-center gap-3 ${
                alerta.tipo === 'CRITICO' ? 'bg-red-50 border border-red-200' :
                alerta.tipo === 'URGENTE' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}
            >
              <span className="text-2xl">
                {alerta.tipo === 'CRITICO' ? '🚨' : alerta.tipo === 'URGENTE' ? '⚠️' : 'ℹ️'}
              </span>
              <p className={`font-medium ${
                alerta.tipo === 'CRITICO' ? 'text-red-700' :
                alerta.tipo === 'URGENTE' ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                {alerta.mensagem}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Cards Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Diametro Atual</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fio.diametro_atual_mm} mm</p>
          <p className="text-xs text-gray-400 mt-1">Min: {fio.diametro_minimo_mm} mm</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Vida Util</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fio.percentual_vida_util}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full ${getVidaUtilColor(fio.percentual_vida_util || 0)}`}
              style={{ width: `${fio.percentual_vida_util || 0}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Area Total Cortada</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {(fio.area_total_cortada_m2 || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m2
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Desgaste Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fio.desgaste_total_mm} mm</p>
        </div>
      </div>

      {/* Especificacoes e Metricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Especificacoes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Especificacoes</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Comprimento</dt>
              <dd className="font-medium text-gray-900">{fio.comprimento_metros} m</dd>
            </div>
            <div>
              <dt className="text-gray-500">Perolas/Metro</dt>
              <dd className="font-medium text-gray-900">{fio.perolas_por_metro}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Total Perolas</dt>
              <dd className="font-medium text-gray-900">{fio.total_perolas}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Diametro Inicial</dt>
              <dd className="font-medium text-gray-900">{fio.diametro_inicial_mm} mm</dd>
            </div>
            <div>
              <dt className="text-gray-500">Data Cadastro</dt>
              <dd className="font-medium text-gray-900">
                {fio.data_cadastro ? new Date(fio.data_cadastro).toLocaleDateString('pt-BR') : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Cliente</dt>
              <dd className="font-medium text-gray-900">{fio.cliente_nome || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Metricas */}
        {fio.metricas && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Metricas de Rendimento</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Total de Cortes</dt>
                <dd className="font-medium text-gray-900">{fio.metricas.total_cortes}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tempo Total</dt>
                <dd className="font-medium text-gray-900">{fio.metricas.tempo_total_horas.toFixed(1)} h</dd>
              </div>
              <div>
                <dt className="text-gray-500">Velocidade Media</dt>
                <dd className="font-medium text-gray-900">{fio.metricas.velocidade_media_m2h.toFixed(2)} m2/h</dd>
              </div>
              <div>
                <dt className="text-gray-500">Rendimento</dt>
                <dd className="font-medium text-gray-900">{fio.metricas.rendimento_m2_por_mm.toFixed(2)} m2/mm</dd>
              </div>
              <div>
                <dt className="text-gray-500">Consumo Combustivel</dt>
                <dd className="font-medium text-gray-900">{fio.metricas.consumo_total_combustivel.toFixed(0)} L</dd>
              </div>
              <div>
                <dt className="text-gray-500">Custo Combustivel</dt>
                <dd className="font-medium text-green-600">
                  R$ {fio.metricas.custo_combustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Grafico de Desgaste */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Curva de Desgaste</h3>
        {historico.length > 1 ? (
          <div className="relative h-64">
            {/* Eixo Y Labels */}
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
              <span>{maxDiametro.toFixed(1)}</span>
              <span>{((maxDiametro + minDiametro) / 2).toFixed(1)}</span>
              <span>{minDiametro.toFixed(1)}</span>
            </div>

            {/* Grafico SVG */}
            <div className="absolute left-14 right-4 top-0 bottom-8">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Linha do diametro minimo */}
                <line
                  x1="0"
                  y1={100 - ((fio.diametro_minimo_mm - minDiametro) / range) * 100}
                  x2="100"
                  y2={100 - ((fio.diametro_minimo_mm - minDiametro) / range) * 100}
                  stroke="#ef4444"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />

                {/* Linha de desgaste */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1"
                  points={historico.map((h, i) => {
                    const x = (i / (historico.length - 1)) * 100;
                    const y = 100 - ((h.diametro_mm - minDiametro) / range) * 100;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Pontos */}
                {historico.map((h, i) => {
                  const x = (i / (historico.length - 1)) * 100;
                  const y = 100 - ((h.diametro_mm - minDiametro) / range) * 100;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill="#3b82f6"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Legenda */}
            <div className="absolute bottom-0 left-14 right-4 flex justify-between text-xs text-gray-500">
              <span>{historico[0]?.data ? new Date(historico[0].data).toLocaleDateString('pt-BR') : 'Inicio'}</span>
              <span>Cortes</span>
              <span>{historico[historico.length - 1]?.data ? new Date(historico[historico.length - 1].data).toLocaleDateString('pt-BR') : 'Atual'}</span>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Registre cortes para visualizar a curva de desgaste
          </div>
        )}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span className="text-gray-600">Diametro ao longo do tempo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500 border-dashed" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-gray-600">Diametro minimo ({fio.diametro_minimo_mm} mm)</span>
          </div>
        </div>
      </div>

      {/* Custos por Fonte de Energia */}
      {custos && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">⛽</span>
              <h3 className="font-semibold text-gray-900">Gerador Diesel</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Area Cortada</dt>
                <dd className="font-medium text-gray-900">{custos.diesel.area_total_m2.toFixed(1)} m2</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tempo</dt>
                <dd className="font-medium text-gray-900">{custos.diesel.tempo_horas.toFixed(1)} h</dd>
              </div>
              <div>
                <dt className="text-gray-500">Consumo</dt>
                <dd className="font-medium text-gray-900">{custos.diesel.consumo_litros.toFixed(0)} L</dd>
              </div>
              <div>
                <dt className="text-gray-500">Custo Total</dt>
                <dd className="font-medium text-green-600">
                  R$ {custos.diesel.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">⚡</span>
              <h3 className="font-semibold text-gray-900">Rede Eletrica</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Area Cortada</dt>
                <dd className="font-medium text-gray-900">{custos.rede_eletrica.area_total_m2.toFixed(1)} m2</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tempo</dt>
                <dd className="font-medium text-gray-900">{custos.rede_eletrica.tempo_horas.toFixed(1)} h</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Custo Estimado</dt>
                <dd className="font-medium text-green-600">
                  R$ {custos.rede_eletrica.custo_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Historico de Cortes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Historico de Cortes</h3>
        </div>
        {cortes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum corte registrado para este fio
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonte</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Area (m2)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tempo (h)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Velocidade</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desgaste (mm)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diam. Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cortes.map((corte) => (
                  <tr key={corte.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(corte.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {corte.hora_inicial} - {corte.hora_final}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {corte.fonte_energia === 'GERADOR_DIESEL' ? '⛽ Diesel' : '⚡ Rede'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {corte.area_corte_m2?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {corte.tempo_execucao_horas?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {corte.velocidade_corte_m2h?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m2/h
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {corte.desgaste_mm?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {corte.diametro_final_mm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Observacoes */}
      {fio.observacoes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Observacoes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{fio.observacoes}</p>
        </div>
      )}
    </div>
  );
}
