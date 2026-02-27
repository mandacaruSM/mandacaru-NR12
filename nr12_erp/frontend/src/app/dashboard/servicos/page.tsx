'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { servicosApi, type Servico, type CategoriaServico } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function ServicosPage() {
  const toast = useToast();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: undefined as number | undefined,
    descricao_detalhada: '',
    preco_venda: 0,
    preco_custo: 0,
    aliquota_iss: 0,
    aliquota_pis: 0,
    aliquota_cofins: 0,
    aliquota_csll: 0,
    aliquota_irpj: 0,
    unidade: 'SERVICO' as const,
    tempo_estimado: undefined as number | undefined,
    ativo: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [servicosData, categoriasData] = await Promise.all([
        servicosApi.servicos.list(),
        servicosApi.categorias.list(),
      ]);
      setServicos(servicosData.results || []);
      setCategorias(categoriasData.results || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast?.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }

  function handleNovo() {
    setEditingServico(null);
    setFormData({
      codigo: '',
      nome: '',
      categoria: undefined,
      descricao_detalhada: '',
      preco_venda: 0,
      preco_custo: 0,
      aliquota_iss: 0,
      aliquota_pis: 0,
      aliquota_cofins: 0,
      aliquota_csll: 0,
      aliquota_irpj: 0,
      unidade: 'SERVICO',
      tempo_estimado: undefined,
      ativo: true,
    });
    setShowModal(true);
  }

  function handleEditar(servico: Servico) {
    setEditingServico(servico);
    setFormData({
      codigo: servico.codigo,
      nome: servico.nome,
      categoria: servico.categoria,
      descricao_detalhada: servico.descricao_detalhada,
      preco_venda: servico.preco_venda,
      preco_custo: servico.preco_custo || 0,
      aliquota_iss: servico.aliquota_iss,
      aliquota_pis: servico.aliquota_pis,
      aliquota_cofins: servico.aliquota_cofins,
      aliquota_csll: servico.aliquota_csll,
      aliquota_irpj: servico.aliquota_irpj,
      unidade: servico.unidade,
      tempo_estimado: servico.tempo_estimado || undefined,
      ativo: servico.ativo,
    });
    setShowModal(true);
  }

  async function handleSalvar() {
    try {
      if (!formData.codigo || !formData.nome) {
        toast?.error('Preencha código e nome');
        return;
      }

      if (editingServico) {
        await servicosApi.servicos.update(editingServico.id, formData);
        toast?.success('Serviço atualizado com sucesso');
      } else {
        await servicosApi.servicos.create(formData);
        toast?.success('Serviço cadastrado com sucesso');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      toast?.error(error.message || 'Erro ao salvar serviço');
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      await servicosApi.servicos.remove(id);
      toast?.success('Serviço excluído com sucesso');
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir serviço:', error);
      toast?.error(error.message || 'Erro ao excluir serviço');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando serviços...</p>
        </div>
      </div>
    );
  }

  const totalImpostos = formData.aliquota_iss + formData.aliquota_pis + formData.aliquota_cofins + formData.aliquota_csll + formData.aliquota_irpj;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie o catálogo de serviços prestados
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNovo}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Novo Serviço
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* Lista de Serviços */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {servicos.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum serviço cadastrado</h3>
            <p className="mt-2 text-sm text-gray-600">
              Comece cadastrando o primeiro serviço do catálogo.
            </p>
            <button
              onClick={handleNovo}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Cadastrar Primeiro Serviço
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Venda
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impostos
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
                {servicos.map((servico) => (
                  <tr key={servico.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {servico.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {servico.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {servico.categoria_nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      R$ {Number(servico.preco_venda).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {servico.total_impostos ? Number(servico.total_impostos).toFixed(2) : '0.00'}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        servico.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {servico.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditar(servico)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(servico.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white font-mono"
                    placeholder="Ex: SRV001"
                    maxLength={60}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                  >
                    <option value="">Sem categoria</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                  placeholder="Ex: Manutenção Preventiva"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Descrição Detalhada
                </label>
                <textarea
                  value={formData.descricao_detalhada}
                  onChange={(e) => setFormData({ ...formData, descricao_detalhada: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                  rows={3}
                  placeholder="Descrição completa do serviço..."
                />
              </div>

              {/* Preços */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Preço de Venda *
                  </label>
                  <input
                    type="number"
                    value={formData.preco_venda}
                    onChange={(e) => setFormData({ ...formData, preco_venda: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Preço de Custo
                  </label>
                  <input
                    type="number"
                    value={formData.preco_custo}
                    onChange={(e) => setFormData({ ...formData, preco_custo: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Unidade
                  </label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                  >
                    <option value="SERVICO">Serviço</option>
                    <option value="HORA">Hora</option>
                    <option value="DIA">Dia</option>
                    <option value="MES">Mês</option>
                    <option value="VISITA">Visita</option>
                  </select>
                </div>
              </div>

              {/* Impostos */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Impostos (%)
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      ISS
                    </label>
                    <input
                      type="number"
                      value={formData.aliquota_iss}
                      onChange={(e) => setFormData({ ...formData, aliquota_iss: Number(e.target.value) })}
                      className="w-full px-2 py-2 border rounded text-gray-900 bg-white text-sm"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      PIS
                    </label>
                    <input
                      type="number"
                      value={formData.aliquota_pis}
                      onChange={(e) => setFormData({ ...formData, aliquota_pis: Number(e.target.value) })}
                      className="w-full px-2 py-2 border rounded text-gray-900 bg-white text-sm"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      COFINS
                    </label>
                    <input
                      type="number"
                      value={formData.aliquota_cofins}
                      onChange={(e) => setFormData({ ...formData, aliquota_cofins: Number(e.target.value) })}
                      className="w-full px-2 py-2 border rounded text-gray-900 bg-white text-sm"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      CSLL
                    </label>
                    <input
                      type="number"
                      value={formData.aliquota_csll}
                      onChange={(e) => setFormData({ ...formData, aliquota_csll: Number(e.target.value) })}
                      className="w-full px-2 py-2 border rounded text-gray-900 bg-white text-sm"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      IRPJ
                    </label>
                    <input
                      type="number"
                      value={formData.aliquota_irpj}
                      onChange={(e) => setFormData({ ...formData, aliquota_irpj: Number(e.target.value) })}
                      className="w-full px-2 py-2 border rounded text-gray-900 bg-white text-sm"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Total de impostos: <span className="font-semibold">{totalImpostos.toFixed(2)}%</span>
                </div>
              </div>

              {/* Outros */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Tempo Estimado (minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.tempo_estimado || ''}
                    onChange={(e) => setFormData({ ...formData, tempo_estimado: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                    min="0"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="ativo" className="ml-2 text-sm text-gray-900">
                    Serviço ativo
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
