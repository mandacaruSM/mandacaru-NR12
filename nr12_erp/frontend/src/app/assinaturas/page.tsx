"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface Plano {
  id: number
  nome: string
  tipo: string
  valor_mensal: string
}

interface Assinatura {
  id: number
  cliente: number
  cliente_nome: string
  plano: number
  plano_nome: string
  plano_valor: string
  status: 'ATIVA' | 'SUSPENSA' | 'CANCELADA' | 'TRIAL'
  esta_ativa: boolean
  data_inicio: string
  data_fim_trial: string | null
  data_proximo_pagamento: string | null
  data_cancelamento: string | null
}

export default function AssinaturasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAssinatura, setSelectedAssinatura] = useState<Assinatura | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<'alterar' | 'suspender' | 'reativar' | 'cancelar' | null>(null)
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null)

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchData()
  }, [user, router])

  const fetchData = async () => {
    try {
      const [assinaturasRes, planosRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/assinaturas/`, {
          credentials: 'include'
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/planos/`, {
          credentials: 'include'
        })
      ])

      if (assinaturasRes.ok && planosRes.ok) {
        const assinaturasData = await assinaturasRes.json()
        const planosData = await planosRes.json()
        setAssinaturas(assinaturasData)
        setPlanos(planosData)
      }
    } catch (err) {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedAssinatura || !modalAction) return

    setLoading(true)
    setError('')

    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/cadastro/assinaturas/${selectedAssinatura.id}/`
      let body = {}

      if (modalAction === 'alterar') {
        url += 'alterar_plano/'
        body = { plano_id: selectedPlanoId }
      } else {
        url += `${modalAction}/`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await fetchData()
        setShowModal(false)
        setSelectedAssinatura(null)
        setModalAction(null)
        setSelectedPlanoId(null)
      } else {
        const data = await response.json()
        setError(data.detail || 'Erro ao executar ação')
      }
    } catch (err) {
      setError('Erro ao executar ação')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (assinatura: Assinatura, action: typeof modalAction) => {
    setSelectedAssinatura(assinatura)
    setModalAction(action)
    if (action === 'alterar') {
      setSelectedPlanoId(assinatura.plano)
    }
    setShowModal(true)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVA: 'bg-green-100 text-green-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      SUSPENSA: 'bg-yellow-100 text-yellow-800',
      CANCELADA: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    )
  }

  if (loading && assinaturas.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Gerenciamento de Assinaturas</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plano
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assinaturas.map((assinatura) => (
              <tr key={assinatura.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {assinatura.cliente_nome}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{assinatura.plano_nome}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    R$ {parseFloat(assinatura.plano_valor).toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(assinatura.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {assinatura.status === 'TRIAL' && assinatura.data_fim_trial
                    ? new Date(assinatura.data_fim_trial).toLocaleDateString('pt-BR')
                    : assinatura.data_proximo_pagamento
                    ? new Date(assinatura.data_proximo_pagamento).toLocaleDateString('pt-BR')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => openModal(assinatura, 'alterar')}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Alterar Plano
                  </button>
                  {assinatura.esta_ativa ? (
                    <button
                      onClick={() => openModal(assinatura, 'suspender')}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Suspender
                    </button>
                  ) : assinatura.status === 'SUSPENSA' ? (
                    <button
                      onClick={() => openModal(assinatura, 'reativar')}
                      className="text-green-600 hover:text-green-900"
                    >
                      Reativar
                    </button>
                  ) : null}
                  {assinatura.status !== 'CANCELADA' && (
                    <button
                      onClick={() => openModal(assinatura, 'cancelar')}
                      className="text-red-600 hover:text-red-900"
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && selectedAssinatura && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {modalAction === 'alterar' && 'Alterar Plano'}
              {modalAction === 'suspender' && 'Suspender Assinatura'}
              {modalAction === 'reativar' && 'Reativar Assinatura'}
              {modalAction === 'cancelar' && 'Cancelar Assinatura'}
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              Cliente: <strong>{selectedAssinatura.cliente_nome}</strong>
            </p>

            {modalAction === 'alterar' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Novo Plano
                </label>
                <select
                  value={selectedPlanoId || ''}
                  onChange={(e) => setSelectedPlanoId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {planos.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome} - R$ {parseFloat(plano.valor_mensal).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modalAction === 'suspender' && (
              <p className="text-sm text-gray-600 mb-4">
                Tem certeza que deseja suspender esta assinatura? O cliente perderá o acesso ao sistema.
              </p>
            )}

            {modalAction === 'reativar' && (
              <p className="text-sm text-gray-600 mb-4">
                Tem certeza que deseja reativar esta assinatura?
              </p>
            )}

            {modalAction === 'cancelar' && (
              <p className="text-sm text-red-600 mb-4">
                Tem certeza que deseja cancelar esta assinatura? Esta ação não pode ser desfeita.
              </p>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedAssinatura(null)
                  setModalAction(null)
                  setSelectedPlanoId(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleAction}
                className={`px-4 py-2 text-white rounded ${
                  modalAction === 'cancelar'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={loading || (modalAction === 'alterar' && !selectedPlanoId)}
              >
                {loading ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
