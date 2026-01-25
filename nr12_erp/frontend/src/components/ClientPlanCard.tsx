"use client"

import { useState, useEffect } from 'react'

interface Assinatura {
  id: number
  plano_nome: string
  plano_valor: string
  status: 'ATIVA' | 'SUSPENSA' | 'CANCELADA' | 'TRIAL'
  esta_ativa: boolean
  data_fim_trial: string | null
  data_proximo_pagamento: string | null
}

interface Plano {
  id: number
  nome: string
  tipo: string
  valor_mensal: string
  limite_usuarios: number
  limite_equipamentos: number
  limite_empreendimentos: number
  modulos_habilitados: string[]
  bot_telegram: boolean
  qr_code_equipamento: boolean
  checklist_mobile: boolean
  backups_automaticos: boolean
  suporte_prioritario: boolean
  suporte_whatsapp: boolean
  multiempresa: boolean
}

interface UsageStats {
  usuarios: number
  equipamentos: number
  empreendimentos: number
}

export default function ClientPlanCard() {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [plano, setPlano] = useState<Plano | null>(null)
  const [usage, setUsage] = useState<UsageStats>({ usuarios: 0, equipamentos: 0, empreendimentos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlanData()
  }, [])

  const fetchPlanData = async () => {
    try {
      // Busca assinatura do cliente
      const assinaturaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/assinaturas/`, {
        credentials: 'include'
      })

      if (assinaturaRes.ok) {
        const assinaturas = await assinaturaRes.json()
        if (assinaturas.length > 0) {
          const minhaAssinatura = assinaturas[0]
          setAssinatura(minhaAssinatura)

          // Busca detalhes do plano
          const planoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/planos/${minhaAssinatura.plano}/`, {
            credentials: 'include'
          })

          if (planoRes.ok) {
            const planoData = await planoRes.json()
            setPlano(planoData)
          }
        }
      }

      // Busca estatísticas de uso
      const [equipamentosRes, empreendimentosRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/equipamentos/equipamentos/?page_size=1`, {
          credentials: 'include'
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/empreendimentos/?page_size=1`, {
          credentials: 'include'
        })
      ])

      const equipamentosData = equipamentosRes.ok ? await equipamentosRes.json() : { count: 0 }
      const empreendimentosData = empreendimentosRes.ok ? await empreendimentosRes.json() : { count: 0 }

      setUsage({
        usuarios: 1, // Por enquanto, o cliente é 1 usuário
        equipamentos: equipamentosData.count || 0,
        empreendimentos: empreendimentosData.count || 0
      })
    } catch (err) {
      console.error('Erro ao carregar dados do plano:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVA: 'bg-green-100 text-green-800 border-green-200',
      TRIAL: 'bg-blue-100 text-blue-800 border-blue-200',
      SUSPENSA: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CANCELADA: 'bg-red-100 text-red-800 border-red-200'
    }
    const labels = {
      ATIVA: 'Ativa',
      TRIAL: 'Trial',
      SUSPENSA: 'Suspensa',
      CANCELADA: 'Cancelada'
    }
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getProgressPercentage = (current: number, limit: number) => {
    if (limit === 0) return 0 // Ilimitado
    return Math.min((current / limit) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!assinatura || !plano) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <p className="text-yellow-800 text-sm">
          Nenhum plano ativo encontrado. Entre em contato com o suporte.
        </p>
      </div>
    )
  }

  const isTrialExpiringSoon = assinatura.status === 'TRIAL' && assinatura.data_fim_trial
  const daysUntilExpiry = isTrialExpiringSoon
    ? Math.ceil((new Date(assinatura.data_fim_trial!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">Seu Plano</h2>
          {getStatusBadge(assinatura.status)}
        </div>
        <p className="text-3xl font-bold text-white mb-1">{plano.nome}</p>
        <p className="text-blue-100">R$ {parseFloat(plano.valor_mensal).toFixed(2)}/mês</p>
      </div>

      {/* Trial Warning */}
      {isTrialExpiringSoon && daysUntilExpiry <= 7 && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-yellow-900">
                Período trial expira em {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dia' : 'dias'}
              </p>
              <p className="text-xs text-yellow-800 mt-1">
                Entre em contato com o suporte para ativar sua assinatura.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Datas */}
        <div className="mb-6">
          {assinatura.status === 'TRIAL' && assinatura.data_fim_trial && (
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-600">Trial válido até:</span>
              <span className="font-semibold text-gray-900">
                {new Date(assinatura.data_fim_trial).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          {assinatura.data_proximo_pagamento && assinatura.status === 'ATIVA' && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Próximo pagamento:</span>
              <span className="font-semibold text-gray-900">
                {new Date(assinatura.data_proximo_pagamento).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {/* Limites de Uso */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Uso de Recursos</h3>

          {/* Usuários */}
          {plano.limite_usuarios > 0 && (
            <div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Usuários</span>
                <span className="font-semibold text-gray-900">
                  {usage.usuarios} / {plano.limite_usuarios}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    getProgressPercentage(usage.usuarios, plano.limite_usuarios)
                  )}`}
                  style={{ width: `${getProgressPercentage(usage.usuarios, plano.limite_usuarios)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Equipamentos */}
          {plano.limite_equipamentos > 0 ? (
            <div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Equipamentos</span>
                <span className="font-semibold text-gray-900">
                  {usage.equipamentos} / {plano.limite_equipamentos}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    getProgressPercentage(usage.equipamentos, plano.limite_equipamentos)
                  )}`}
                  style={{ width: `${getProgressPercentage(usage.equipamentos, plano.limite_equipamentos)}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Equipamentos</span>
              <span className="font-semibold text-green-600">Ilimitado ✓</span>
            </div>
          )}

          {/* Empreendimentos */}
          {plano.limite_empreendimentos > 0 ? (
            <div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Empreendimentos</span>
                <span className="font-semibold text-gray-900">
                  {usage.empreendimentos} / {plano.limite_empreendimentos}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    getProgressPercentage(usage.empreendimentos, plano.limite_empreendimentos)
                  )}`}
                  style={{ width: `${getProgressPercentage(usage.empreendimentos, plano.limite_empreendimentos)}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Empreendimentos</span>
              <span className="font-semibold text-green-600">Ilimitado ✓</span>
            </div>
          )}
        </div>

        {/* Módulos Habilitados */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Módulos Disponíveis</h3>
          <div className="flex flex-wrap gap-2">
            {plano.modulos_habilitados.map((modulo) => (
              <span
                key={modulo}
                className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
              >
                {modulo}
              </span>
            ))}
          </div>
        </div>

        {/* Features Premium */}
        {(plano.bot_telegram || plano.qr_code_equipamento || plano.checklist_mobile ||
          plano.suporte_prioritario || plano.suporte_whatsapp || plano.multiempresa) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recursos Especiais</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {plano.bot_telegram && (
                <div className="flex items-center text-gray-700">
                  <span className="mr-2">✓</span> Bot Telegram
                </div>
              )}
              {plano.qr_code_equipamento && (
                <div className="flex items-center text-gray-700">
                  <span className="mr-2">✓</span> QR Code
                </div>
              )}
              {plano.checklist_mobile && (
                <div className="flex items-center text-gray-700">
                  <span className="mr-2">✓</span> Checklist Mobile
                </div>
              )}
              {plano.suporte_prioritario && (
                <div className="flex items-center text-gray-700">
                  <span className="mr-2">✓</span> Suporte Prioritário
                </div>
              )}
              {plano.suporte_whatsapp && (
                <div className="flex items-center text-gray-700">
                  <span className="mr-2">✓</span> Suporte WhatsApp
                </div>
              )}
              {plano.multiempresa && (
                <div className="flex items-center text-gray-700">
                  <span className="mr-2">✓</span> Multi-empresa
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {(getProgressPercentage(usage.equipamentos, plano.limite_equipamentos) >= 80 ||
        getProgressPercentage(usage.empreendimentos, plano.limite_empreendimentos) >= 80) && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-t border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-900">
                Você está próximo do limite
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Considere fazer upgrade do seu plano
              </p>
            </div>
            <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors">
              Ver Planos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
