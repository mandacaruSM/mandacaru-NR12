'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { almoxarifadoApi, type Produto, type UnidadeMedida, type CategoriaProduto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function NovoProdutoPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);

  const [formData, setFormData] = useState<Partial<Produto>>({
    codigo: '',
    nome: '',
    tipo: 'PECA',
    categoria: undefined,
    unidade: undefined,
    ativo: true,
    densidade_kg_l: undefined,
  });

  useEffect(() => {
    loadUnidadesECategorias();
  }, []);

  const loadUnidadesECategorias = async () => {
    try {
      const [unidadesResp, categoriasResp] = await Promise.all([
        almoxarifadoApi.unidades.list(),
        almoxarifadoApi.categorias.list(),
      ]);
      console.log('📦 Resposta Unidades:', unidadesResp);
      console.log('📦 Resposta Categorias:', categoriasResp);
      setUnidades(unidadesResp.results || []);
      setCategorias(categoriasResp.results || []);
      console.log('✅ Unidades carregadas:', unidadesResp.results?.length || 0);
      console.log('✅ Categorias carregadas:', categoriasResp.results?.length || 0);
    } catch (err) {
      console.error('Erro ao carregar unidades e categorias:', err);
      toast?.error('Erro ao carregar dados de cadastro');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validações
      if (!formData.codigo || !formData.nome) {
        throw new Error('Código e nome são obrigatórios');
      }
      if (!formData.categoria || !formData.unidade) {
        throw new Error('Categoria e unidade são obrigatórias');
      }

      // Prepara dados para envio
      const data = {
        codigo: formData.codigo,
        nome: formData.nome,
        tipo: formData.tipo,
        categoria: Number(formData.categoria),
        unidade: Number(formData.unidade),
        ativo: formData.ativo,
        densidade_kg_l: formData.densidade_kg_l || null,
      };

      console.log('📝 Enviando produto:', data);

      const produto = await almoxarifadoApi.produtos.create(data);

      console.log('✅ Produto criado:', produto);
      toast?.success('Produto cadastrado com sucesso!');
      router.push('/dashboard/almoxarifado/produtos');
    } catch (err: any) {
      console.error('❌ Erro ao criar produto:', err);
      const message = err.message || 'Erro ao cadastrar produto';
      setError(message);
      toast?.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
        <Link
          href="/dashboard/almoxarifado/produtos"
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Voltar
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Informações Básicas */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="codigo" className="block text-sm font-medium text-gray-900 mb-1">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="codigo"
                name="codigo"
                value={formData.codigo || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Ex: PECA001"
              />
            </div>

            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-900 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Nome do produto"
              />
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-900 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo || 'PECA'}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="PECA">Peça</option>
                <option value="COMBUSTIVEL">Combustível</option>
                <option value="INSUMO">Insumo</option>
              </select>
            </div>

            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-900 mb-1">
                Categoria <span className="text-red-500">*</span>
              </label>
              <select
                id="categoria"
                name="categoria"
                value={formData.categoria || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">Selecione...</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="unidade" className="block text-sm font-medium text-gray-900 mb-1">
                Unidade <span className="text-red-500">*</span>
              </label>
              <select
                id="unidade"
                name="unidade"
                value={formData.unidade || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">Selecione...</option>
                {unidades.map(un => (
                  <option key={un.id} value={un.id}>{un.sigla} - {un.descricao}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="ativo"
                name="ativo"
                checked={formData.ativo || false}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                Produto Ativo
              </label>
            </div>
          </div>
        </div>

        {/* Informações Específicas */}
        {formData.tipo === 'COMBUSTIVEL' && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações de Combustível</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="densidade_kg_l" className="block text-sm font-medium text-gray-900 mb-1">
                  Densidade (kg/L)
                </label>
                <input
                  type="number"
                  id="densidade_kg_l"
                  name="densidade_kg_l"
                  value={formData.densidade_kg_l || ''}
                  onChange={handleChange}
                  step="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Ex: 0.850"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Densidade do combustível em kg/L (ex: diesel ≈ 0.85)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/almoxarifado/produtos"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </div>
  );
}
