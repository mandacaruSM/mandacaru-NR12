// frontend/src/app/dashboard/manutencao-preventiva/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getDashboardProgramacoes,
  atualizarTodasProgramacoes,
  formatarLeitura,
  getPercentualColor,
} from '@/services/manutencao-preventiva-service'
import type { DashboardProgramacoes } from '@/types/manutencao-preventiva'
import {
  STATUS_PROGRAMACAO_LABELS,
  STATUS_PROGRAMACAO_COLORS,
} from '@/types/manutencao-preventiva'

export default function ManutencaoPreventivaDashboardPage() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<DashboardProgramacoes | null>(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDashboardProgramacoes()
      setDashboard(data)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleAtualizarTodas = async () => {
    try {
      setAtualizando(true)
      const result = await atualizarTodasProgramacoes()
      alert(`${result.message}\n${result.atualizadas} programações atualizadas`)
      await loadDashboard() // Recarrega o dashboard
    } catch (err) {
      console.error('Erro ao atualizar programações:', err)
      alert('Erro ao atualizar programações')
    } finally {
      setAtualizando(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando dashboard...</div>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Erro ao carregar dados'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manutenção Preventiva</h1>
          <p className="text-gray-600 mt-1">
            Gerenciamento de manutenções programadas por horímetro/odômetro
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAtualizarTodas}
            disabled={atualizando}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {atualizando ? 'Atualizando...' : 'Atualizar Status'}
          </button>
          <Link
            href="/dashboard/manutencao-preventiva/programacoes/nova"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Nova Programação
          </Link>
          <Link
            href="/dashboard/manutencao-preventiva/modelos"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Modelos
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total de Programações</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{dashboard.total}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Ativas</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{dashboard.ativas}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Pendentes</div>
          <div className="text-3xl font-bold text-yellow-600 mt-2">{dashboard.pendentes}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Em Atraso</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{dashboard.em_atraso}</div>
        </div>
      </div>

      {/* Status Distribution */}
      {dashboard.por_status.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Distribuição por Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dashboard.por_status.map((stat) => (
              <div key={stat.status} className="text-center">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STATUS_PROGRAMACAO_COLORS[stat.status]}`}>
                  {STATUS_PROGRAMACAO_LABELS[stat.status]}
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-2">{stat.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximas Manutenções */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Próximas Manutenções</h2>
          <Link
            href="/dashboard/manutencao-preventiva/programacoes"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver todas →
          </Link>
        </div>

        {dashboard.proximas_manutencoes.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma manutenção pendente ou em atraso
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Próxima Manutenção
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboard.proximas_manutencoes.map((prog) => (
                  <tr key={prog.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {prog.equipamento__codigo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {prog.equipamento__descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prog.modelo__nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {parseFloat(prog.leitura_proxima_manutencao).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_PROGRAMACAO_COLORS[prog.status]}`}>
                        {STATUS_PROGRAMACAO_LABELS[prog.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/manutencao-preventiva/programacoes/${prog.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/dashboard/manutencao-preventiva/executar?programacao=${prog.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Executar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/manutencao-preventiva/programacoes"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Programações</h3>
          <p className="text-gray-600 text-sm">
            Gerenciar todas as programações de manutenção preventiva
          </p>
        </Link>

        <Link
          href="/dashboard/manutencao-preventiva/historico"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Histórico</h3>
          <p className="text-gray-600 text-sm">
            Ver histórico de manutenções realizadas e estatísticas
          </p>
        </Link>

        <Link
          href="/dashboard/manutencao-preventiva/modelos"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Modelos</h3>
          <p className="text-gray-600 text-sm">
            Criar e gerenciar modelos de manutenção preventiva
          </p>
        </Link>
      </div>
    </div>
  )
}
