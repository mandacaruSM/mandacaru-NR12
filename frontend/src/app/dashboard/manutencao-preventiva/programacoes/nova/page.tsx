// frontend/src/app/dashboard/manutencao-preventiva/programacoes/nova/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  createProgramacaoManutencao,
  getModelosManutencaoPreventiva,
  formatarLeitura,
} from '@/services/manutencao-preventiva-service'
import type {
  ProgramacaoManutencaoFormData,
  ModeloManutencaoPreventiva,
} from '@/types/manutencao-preventiva'
import { equipamentosApi, clientesApi, empreendimentosApi, type Equipamento, type Cliente, type Empreendimento } from '@/lib/api'

export default function NovaProgramacaoManutencao() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [modelos, setModelos] = useState<ModeloManutencaoPreventiva[]>([])

  const [selectedCliente, setSelectedCliente] = useState<number>(0)
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<number>(0)
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null)
  const [selectedModelo, setSelectedModelo] = useState<ModeloManutencaoPreventiva | null>(null)

  const [formData, setFormData] = useState<ProgramacaoManutencaoFormData>({
    equipamento: 0,
    modelo: 0,
    leitura_inicial: 0,
    ativo: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedCliente) {
      loadEmpreendimentos(selectedCliente)
    } else {
      setEmpreendimentos([])
      setSelectedEmpreendimento(0)
      setEquipamentos([])
    }
  }, [selectedCliente])

  useEffect(() => {
    if (selectedEmpreendimento) {
      loadEquipamentos(selectedCliente, selectedEmpreendimento)
    } else {
      setEquipamentos([])
    }
  }, [selectedEmpreendimento])

  const loadData = async () => {
    try {
      const [clientesData, modelosData] = await Promise.all([
        clientesApi.list(),
        getModelosManutencaoPreventiva({ ativo: true, page_size: 100 }),
      ])
      setClientes(clientesData.results)
      setModelos(modelosData.results)
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados')
    }
  }

  const loadEmpreendimentos = async (clienteId: number) => {
    try {
      const response = await empreendimentosApi.list({ cliente: clienteId })
      setEmpreendimentos(response.results)
    } catch (err: any) {
      console.error('Erro ao carregar empreendimentos:', err)
      setError(err.message || 'Erro ao carregar empreendimentos')
    }
  }

  const loadEquipamentos = async (clienteId: number, empreendimentoId: number) => {
    try {
      const response = await equipamentosApi.list({
        cliente: clienteId,
        empreendimento: empreendimentoId
      })
      setEquipamentos(response.results)
    } catch (err: any) {
      console.error('Erro ao carregar equipamentos:', err)
      setError(err.message || 'Erro ao carregar equipamentos')
    }
  }

  const handleEquipamentoChange = (equipamentoId: number) => {
    const equipamento = equipamentos.find((e) => e.id === equipamentoId)
    setSelectedEquipamento(equipamento || null)
    setFormData((prev) => ({
      ...prev,
      equipamento: equipamentoId,
      leitura_inicial: (equipamento as any)?.horimetro || (equipamento as any)?.km || 0,
    }))

    // Filtrar modelos compatíveis com o tipo do equipamento
    if (equipamento) {
      const modelosCompativeis = modelos.filter(
        (m) => m.tipo_equipamento === (equipamento as any).tipo_equipamento_id
      )
      if (modelosCompativeis.length > 0 && !modelosCompativeis.find((m) => m.id === formData.modelo)) {
        setFormData((prev) => ({ ...prev, modelo: 0 }))
        setSelectedModelo(null)
      }
    }
  }

  const handleModeloChange = (modeloId: number) => {
    const modelo = modelos.find((m) => m.id === modeloId)
    setSelectedModelo(modelo || null)
    setFormData((prev) => ({ ...prev, modelo: modeloId }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validações
      if (!formData.equipamento || formData.equipamento === 0) {
        setError('Selecione um equipamento')
        setLoading(false)
        return
      }

      if (!formData.modelo || formData.modelo === 0) {
        setError('Selecione um modelo de manutenção')
        setLoading(false)
        return
      }

      if (Number(formData.leitura_inicial) < 0) {
        setError('Leitura inicial não pode ser negativa')
        setLoading(false)
        return
      }

      const programacao = await createProgramacaoManutencao(formData)
      alert('Programação criada com sucesso!')
      router.push('/dashboard/manutencao-preventiva/programacoes')
    } catch (err: any) {
      console.error('Erro ao criar programação:', err)
      setError(err.message || 'Erro ao criar programação')
    } finally {
      setLoading(false)
    }
  }

  const modelosFiltrados = selectedEquipamento
    ? modelos.filter((m) => m.tipo_equipamento === (selectedEquipamento as any).tipo_equipamento_id)
    : modelos

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Programação de Manutenção</h1>
          <p className="text-gray-600 mt-1">
            Agende manutenções preventivas para um equipamento
          </p>
        </div>
        <Link
          href="/dashboard/manutencao-preventiva/programacoes"
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
        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Cliente <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCliente}
            onChange={(e) => {
              const clienteId = parseInt(e.target.value)
              setSelectedCliente(clienteId)
              setSelectedEmpreendimento(0)
              setFormData((prev) => ({ ...prev, equipamento: 0 }))
              setSelectedEquipamento(null)
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="" className="text-gray-900">Selecione um cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id} className="text-gray-900">
                {(cliente as any).nome}
              </option>
            ))}
          </select>
        </div>

        {/* Empreendimento */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Empreendimento <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedEmpreendimento}
            onChange={(e) => {
              const empId = parseInt(e.target.value)
              setSelectedEmpreendimento(empId)
              setFormData((prev) => ({ ...prev, equipamento: 0 }))
              setSelectedEquipamento(null)
            }}
            required
            disabled={!selectedCliente}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
          >
            <option value="" className="text-gray-900">
              {selectedCliente ? 'Selecione um empreendimento' : 'Selecione primeiro um cliente'}
            </option>
            {empreendimentos.map((empreendimento) => (
              <option key={empreendimento.id} value={empreendimento.id} className="text-gray-900">
                {empreendimento.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Equipamento */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Equipamento <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.equipamento}
            onChange={(e) => handleEquipamentoChange(parseInt(e.target.value))}
            required
            disabled={!selectedEmpreendimento}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
          >
            <option value="" className="text-gray-900">
              {selectedEmpreendimento ? 'Selecione um equipamento' : 'Selecione primeiro um empreendimento'}
            </option>
            {equipamentos.map((equipamento) => (
              <option key={equipamento.id} value={equipamento.id} className="text-gray-900">
                {equipamento.codigo} - {equipamento.descricao}
              </option>
            ))}
          </select>
          {selectedEquipamento && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm space-y-1 text-gray-900">
                <div>
                  <span className="font-medium text-gray-900">Tipo:</span>{' '}
                  {(selectedEquipamento as any).tipo_equipamento_nome}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Empreendimento:</span>{' '}
                  {selectedEquipamento.empreendimento_nome}
                </div>
                {(selectedEquipamento as any).horimetro && (
                  <div>
                    <span className="font-medium text-gray-900">Horímetro atual:</span>{' '}
                    {(selectedEquipamento as any).horimetro} horas
                  </div>
                )}
                {(selectedEquipamento as any).km && (
                  <div>
                    <span className="font-medium text-gray-900">KM atual:</span> {(selectedEquipamento as any).km} km
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Modelo de Manutenção <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.modelo}
            onChange={(e) => handleModeloChange(parseInt(e.target.value))}
            required
            disabled={!selectedEquipamento}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
          >
            <option value="" className="text-gray-900">
              {selectedEquipamento
                ? 'Selecione um modelo'
                : 'Selecione primeiro um equipamento'}
            </option>
            {modelosFiltrados.map((modelo) => (
              <option key={modelo.id} value={modelo.id} className="text-gray-900">
                {modelo.nome}
              </option>
            ))}
          </select>
          {selectedModelo && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm space-y-1 text-gray-900">
                <div>
                  <span className="font-medium text-gray-900">Descrição:</span> {selectedModelo.descricao}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Tipo de Medição:</span>{' '}
                  {selectedModelo.tipo_medicao_display}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Intervalo:</span>{' '}
                  {formatarLeitura(selectedModelo.intervalo, selectedModelo.tipo_medicao)}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Tolerância:</span>{' '}
                  {formatarLeitura(selectedModelo.tolerancia, selectedModelo.tipo_medicao)}
                </div>
                {selectedModelo.total_itens !== undefined && (
                  <div>
                    <span className="font-medium text-gray-900">Itens no checklist:</span>{' '}
                    {selectedModelo.total_itens}
                  </div>
                )}
              </div>
            </div>
          )}
          {selectedEquipamento && modelosFiltrados.length === 0 && (
            <p className="text-sm text-red-600 mt-2">
              Não há modelos de manutenção cadastrados para o tipo{' '}
              {(selectedEquipamento as any).tipo_equipamento_nome}.{' '}
              <Link
                href="/dashboard/manutencao-preventiva/modelos/novo"
                className="font-medium underline"
              >
                Criar modelo
              </Link>
            </p>
          )}
        </div>

        {/* Leitura Inicial */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Leitura Inicial <span className="text-red-500">*</span>
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
            {selectedModelo && (
              <span className="absolute right-3 top-2 text-gray-500 text-sm">
                {selectedModelo.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Leitura atual do {selectedModelo?.tipo_medicao === 'HORIMETRO' ? 'horímetro' : 'odômetro'} do equipamento
          </p>
        </div>

        {/* Preview da Próxima Manutenção */}
        {selectedModelo && formData.leitura_inicial && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Preview da Programação
            </h4>
            <div className="text-sm text-gray-900 space-y-1">
              <div>
                <span className="font-medium text-gray-900">Próxima manutenção em:</span>{' '}
                {formatarLeitura(
                  (Number(formData.leitura_inicial) + Number(selectedModelo.intervalo)).toString(),
                  selectedModelo.tipo_medicao
                )}
              </div>
              <div>
                <span className="font-medium text-gray-900">Alerta antecipado em:</span>{' '}
                {formatarLeitura(
                  (
                    Number(formData.leitura_inicial) +
                    Number(selectedModelo.intervalo) -
                    Number(selectedModelo.tolerancia)
                  ).toString(),
                  selectedModelo.tipo_medicao
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ativo */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={(e) => setFormData((prev) => ({ ...prev, ativo: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm font-medium text-gray-700">Programação ativa</label>
          <p className="ml-2 text-sm text-gray-500">
            (Somente programações ativas geram alertas e permitem execução)
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">Como funciona</h4>
              <p className="text-sm text-gray-900 mt-1">
                A programação calculará automaticamente quando a próxima manutenção deve ocorrer
                com base no intervalo definido no modelo. O status será atualizado conforme a
                leitura atual do equipamento se aproxima da meta.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/manutencao-preventiva/programacoes"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando...' : 'Criar Programação'}
          </button>
        </div>
      </form>
    </div>
  )
}
