// frontend/src/app/dashboard/manutencao-preventiva/programacoes/[id]/editar/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProgramacaoManutencaoDetail,
  updateProgramacaoManutencao,
  formatarLeitura,
} from '@/services/manutencao-preventiva-service'
import type { ProgramacaoManutencao } from '@/types/manutencao-preventiva'

export default function EditarProgramacaoManutencao() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [programacao, setProgramacao] = useState<ProgramacaoManutencao | null>(null)

  const [formData, setFormData] = useState({
    leitura_inicial: 0,
    leitura_ultima_manutencao: 0,
    leitura_proxima_manutencao: 0,
    status: 'ATIVA',
    ativo: true,
  })

  useEffect(() => {
    loadProgramacao()
  }, [id])

  const loadProgramacao = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProgramacaoManutencaoDetail(id)
      setProgramacao(data)
      setFormData({
        leitura_inicial: Number(data.leitura_inicial),
        leitura_ultima_manutencao: Number(data.leitura_ultima_manutencao),
        leitura_proxima_manutencao: Number(data.leitura_proxima_manutencao),
        status: data.status,
        ativo: data.ativo,
      })
    } catch (err: any) {
      console.error('Erro ao carregar programação:', err)
      setError(err.message || 'Erro ao carregar programação')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await updateProgramacaoManutencao(id, formData)
      alert('Programação atualizada com sucesso!')
      router.push(`/dashboard/manutencao-preventiva/programacoes/${id}`)
    } catch (err: any) {
      console.error('Erro ao atualizar programação:', err)
      setError(err.message || 'Erro ao atualizar programação')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!programacao) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Programação não encontrada
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Programação</h1>
          <p className="text-gray-900 mt-1">
            {programacao.equipamento_codigo} - {programacao.modelo_nome}
          </p>
        </div>
        <Link
          href={`/dashboard/manutencao-preventiva/programacoes/${id}`}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← Voltar
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-900">Equipamento:</span>
            <div className="text-gray-900">{programacao.equipamento_codigo}</div>
          </div>
          <div>
            <span className="font-medium text-gray-900">Modelo:</span>
            <div className="text-gray-900">{programacao.modelo_nome}</div>
          </div>
          <div>
            <span className="font-medium text-gray-900">Tipo:</span>
            <div className="text-gray-900">{programacao.tipo_medicao_display}</div>
          </div>
          <div>
            <span className="font-medium text-gray-900">Intervalo:</span>
            <div className="text-gray-900">
              {formatarLeitura(programacao.modelo_intervalo, programacao.tipo_medicao)}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Leitura Inicial */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Leitura Inicial
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.leitura_inicial}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, leitura_inicial: Number(e.target.value) }))
              }
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">
              {programacao.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
            </span>
          </div>
        </div>

        {/* Leitura Última Manutenção */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Leitura da Última Manutenção
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.leitura_ultima_manutencao}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  leitura_ultima_manutencao: Number(e.target.value),
                }))
              }
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">
              {programacao.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
            </span>
          </div>
        </div>

        {/* Leitura Próxima Manutenção */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Leitura da Próxima Manutenção
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.leitura_proxima_manutencao}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  leitura_proxima_manutencao: Number(e.target.value),
                }))
              }
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">
              {programacao.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Sugestão: Última manutenção + intervalo ={' '}
            {formatarLeitura(
              formData.leitura_ultima_manutencao + Number(programacao.modelo_intervalo),
              programacao.tipo_medicao
            )}
          </p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="ATIVA">Ativa</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_ATRASO">Em Atraso</option>
            <option value="INATIVA">Inativa</option>
          </select>
        </div>

        {/* Ativo */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={(e) => setFormData((prev) => ({ ...prev, ativo: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm font-medium text-gray-900">Programação ativa</label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href={`/dashboard/manutencao-preventiva/programacoes/${id}`}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
