// frontend/src/app/dashboard/manutencao-preventiva/modelos/[id]/editar/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getModeloManutencaoPreventivaDetail,
  updateModeloManutencaoPreventiva,
} from '@/services/manutencao-preventiva-service'
import type { ModeloManutencaoPreventivaFormData } from '@/types/manutencao-preventiva'
import { tiposEquipamentoApi, type TipoEquipamento } from '@/lib/api'

export default function EditarModeloManutencaoPreventiva() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamento[]>([])

  const [formData, setFormData] = useState<ModeloManutencaoPreventivaFormData>({
    nome: '',
    descricao: '',
    tipo_equipamento: 0,
    tipo_medicao: 'HORIMETRO',
    intervalo: '0',
    tolerancia: '0',
    ativo: true,
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [modelo, tipos] = await Promise.all([
        getModeloManutencaoPreventivaDetail(id),
        tiposEquipamentoApi.list(),
      ])

      setTiposEquipamento(tipos.results)
      setFormData({
        nome: modelo.nome,
        descricao: modelo.descricao || '',
        tipo_equipamento: modelo.tipo_equipamento,
        tipo_medicao: modelo.tipo_medicao,
        intervalo: modelo.intervalo,
        tolerancia: modelo.tolerancia,
        ativo: modelo.ativo,
      })
    } catch (err: any) {
      console.error('Erro ao carregar modelo:', err)
      setError(err.message || 'Erro ao carregar dados do modelo')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validações
      if (!formData.nome.trim()) {
        setError('Nome é obrigatório')
        setSubmitting(false)
        return
      }

      if (!formData.tipo_equipamento || formData.tipo_equipamento === 0) {
        setError('Selecione um tipo de equipamento')
        setSubmitting(false)
        return
      }

      if (parseFloat(formData.intervalo) <= 0) {
        setError('Intervalo deve ser maior que zero')
        setSubmitting(false)
        return
      }

      if (parseFloat(formData.tolerancia) < 0) {
        setError('Tolerância não pode ser negativa')
        setSubmitting(false)
        return
      }

      await updateModeloManutencaoPreventiva(id, formData)
      alert('Modelo atualizado com sucesso!')
      router.push(`/dashboard/manutencao-preventiva/modelos/${id}`)
    } catch (err: any) {
      console.error('Erro ao atualizar modelo:', err)
      setError(err.message || 'Erro ao atualizar modelo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Modelo de Manutenção</h1>
          <p className="text-gray-600 mt-1">Modelo #{id}</p>
        </div>
        <Link
          href={`/dashboard/manutencao-preventiva/modelos/${id}`}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Modelo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Manutenção Preventiva Retroescavadeira"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Descreva o propósito deste modelo de manutenção..."
          />
        </div>

        {/* Tipo de Equipamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Equipamento <span className="text-red-500">*</span>
          </label>
          <select
            name="tipo_equipamento"
            value={formData.tipo_equipamento}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione um tipo</option>
            {tiposEquipamento.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Medição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Medição <span className="text-red-500">*</span>
          </label>
          <select
            name="tipo_medicao"
            value={formData.tipo_medicao}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="HORIMETRO">Horímetro (horas)</option>
            <option value="ODOMETRO">Odômetro (km)</option>
          </select>
        </div>

        {/* Intervalo e Tolerância */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="intervalo"
                value={formData.intervalo}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">
                {formData.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tolerância <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="tolerancia"
                value={formData.tolerancia}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">
                {formData.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
              </span>
            </div>
          </div>
        </div>

        {/* Ativo */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="ativo"
            checked={formData.ativo}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm font-medium text-gray-700">Modelo ativo</label>
        </div>

        {/* Warning Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Atenção</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Alterações no intervalo ou tipo de medição podem afetar as programações existentes
                baseadas neste modelo.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href={`/dashboard/manutencao-preventiva/modelos/${id}`}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
