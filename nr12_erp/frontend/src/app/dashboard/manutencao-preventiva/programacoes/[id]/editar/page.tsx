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
import { itensManutencaoApi, type ItemManutencao } from '@/lib/api'

export default function EditarProgramacaoManutencao() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [programacao, setProgramacao] = useState<ProgramacaoManutencao | null>(null)
  const [itensManutencao, setItensManutencao] = useState<ItemManutencao[]>([])
  const [itensSelecionados, setItensSelecionados] = useState<number[]>([])

  const [formData, setFormData] = useState({
    leitura_inicial: 0,
    leitura_ultima_manutencao: 0,
    leitura_proxima_manutencao: 0,
    status: 'ATIVA',
    ativo: true,
    itens_manutencao: [] as number[],
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

      // Carregar itens de manutenção do equipamento
      const itensResponse = await itensManutencaoApi.list({ equipamento: data.equipamento })
      setItensManutencao(itensResponse.results)

      // Carregar itens já selecionados na programação
      const itensIds = (data as any).itens_manutencao || []
      setItensSelecionados(itensIds)

      setFormData({
        leitura_inicial: Number(data.leitura_inicial),
        leitura_ultima_manutencao: Number(data.leitura_ultima_manutencao),
        leitura_proxima_manutencao: Number(data.leitura_proxima_manutencao),
        status: data.status,
        ativo: data.ativo,
        itens_manutencao: itensIds,
      })
    } catch (err: any) {
      console.error('Erro ao carregar programação:', err)
      setError(err.message || 'Erro ao carregar programação')
    } finally {
      setLoading(false)
    }
  }

  const toggleItemManutencao = (itemId: number) => {
    setItensSelecionados(prev => {
      const newSelection = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]

      setFormData(f => ({ ...f, itens_manutencao: newSelection }))
      return newSelection
    })
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

        {/* Itens de Manutenção */}
        {itensManutencao.length > 0 && (
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-900">
                Itens de Manutenção
              </label>
              <Link
                href={`/dashboard/equipamentos/${programacao.equipamento}/manutencao`}
                target="_blank"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Gerenciar itens →
              </Link>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Selecione os itens que serão executados nesta manutenção preventiva
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {itensManutencao.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    id={`item-edit-${item.id}`}
                    checked={itensSelecionados.includes(item.id)}
                    onChange={() => toggleItemManutencao(item.id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`item-edit-${item.id}`} className="ml-3 flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {item.categoria_display}
                      </span>
                      <span className="font-medium text-gray-900">
                        {item.produto_nome}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.quantidade_necessaria} {item.unidade_sigla}
                      {item.descricao && ` • ${item.descricao}`}
                    </div>
                    {(item.periodicidade_km || item.periodicidade_horas || item.periodicidade_dias) && (
                      <div className="text-xs text-gray-400 mt-1">
                        Periodicidade:
                        {item.periodicidade_km && ` ${item.periodicidade_km} km`}
                        {item.periodicidade_horas && ` ${item.periodicidade_horas} horas`}
                        {item.periodicidade_dias && ` ${item.periodicidade_dias} dias`}
                      </div>
                    )}
                  </label>
                </div>
              ))}
            </div>
            {itensSelecionados.length > 0 && (
              <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-800">
                {itensSelecionados.length} {itensSelecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </div>
            )}
          </div>
        )}

        {itensManutencao.length === 0 && (
          <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Nenhum item de manutenção cadastrado</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Este equipamento ainda não possui itens de manutenção (filtros, óleos, correias, etc.).{' '}
                  <Link
                    href={`/dashboard/equipamentos/${programacao.equipamento}/manutencao`}
                    target="_blank"
                    className="font-medium underline"
                  >
                    Cadastrar itens agora
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

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
