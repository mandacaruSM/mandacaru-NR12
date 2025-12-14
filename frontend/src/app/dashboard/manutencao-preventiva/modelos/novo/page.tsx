// frontend/src/app/dashboard/manutencao-preventiva/modelos/novo/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createModeloManutencaoPreventiva } from '@/services/manutencao-preventiva-service'
import type { ModeloManutencaoPreventivaFormData } from '@/types/manutencao-preventiva'
import { tiposEquipamentoApi, type TipoEquipamento } from '@/lib/api'

export default function NovoModeloManutencaoPreventiva() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    loadTiposEquipamento()
  }, [])

  const loadTiposEquipamento = async () => {
    try {
      const response = await tiposEquipamentoApi.list()
      setTiposEquipamento(response.results)
    } catch (err) {
      console.error('Erro ao carregar tipos de equipamento:', err)
      setError('Erro ao carregar tipos de equipamento')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validações
      if (!formData.nome.trim()) {
        setError('Nome é obrigatório')
        setLoading(false)
        return
      }

      if (!formData.tipo_equipamento || formData.tipo_equipamento === 0) {
        setError('Selecione um tipo de equipamento')
        setLoading(false)
        return
      }

      if (parseFloat(formData.intervalo) <= 0) {
        setError('Intervalo deve ser maior que zero')
        setLoading(false)
        return
      }

      if (parseFloat(formData.tolerancia) < 0) {
        setError('Tolerância não pode ser negativa')
        setLoading(false)
        return
      }

      const modelo = await createModeloManutencaoPreventiva(formData)
      alert('Modelo criado com sucesso!')
      router.push(`/dashboard/manutencao-preventiva/modelos/${modelo.id}`)
    } catch (err: any) {
      console.error('Erro ao criar modelo:', err)
      setError(err.message || 'Erro ao criar modelo')
    } finally {
      setLoading(false)
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Modelo de Manutenção</h1>
          <p className="text-gray-600 mt-1">Crie um template de manutenção preventiva</p>
        </div>
        <Link
          href="/dashboard/manutencao-preventiva/modelos"
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
          <p className="text-sm text-gray-500 mt-1">
            Este modelo será aplicado a equipamentos deste tipo
          </p>
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
          <p className="text-sm text-gray-500 mt-1">
            Define como a manutenção será agendada: por horas de uso ou quilometragem
          </p>
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
                placeholder="Ex: 250"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">
                {formData.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Intervalo entre manutenções (ex: a cada 250h ou 10.000km)
            </p>
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
                placeholder="Ex: 10"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">
                {formData.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Margem de antecedência para avisos (ex: avisar 10h antes)
            </p>
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
          <p className="ml-2 text-sm text-gray-500">
            (Somente modelos ativos podem ser usados em programações)
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Próximos passos</h4>
              <p className="text-sm text-blue-700 mt-1">
                Após criar o modelo, você poderá adicionar os itens de verificação (checklist)
                que serão executados durante a manutenção.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/manutencao-preventiva/modelos"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando...' : 'Criar Modelo'}
          </button>
        </div>
      </form>
    </div>
  )
}
