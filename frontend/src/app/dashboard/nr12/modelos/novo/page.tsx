// frontend/src/app/dashboard/nr12/modelos/novo/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { nr12Api, tiposEquipamentoApi, ModeloChecklist, TipoEquipamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function NovoModeloPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Partial<ModeloChecklist>>({
    tipo_equipamento: undefined,
    nome: '',
    descricao: '',
    periodicidade: 'DIARIO',
    ativo: true,
  });

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      setLoadingTipos(true);
      const response = await tiposEquipamentoApi.list();
      setTipos(response.results.filter(t => t.ativo));
    } catch (err: any) {
      toast.error('Erro ao carregar tipos de equipamento');
    } finally {
      setLoadingTipos(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'tipo_equipamento' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.tipo_equipamento) {
      toast.error('Selecione um tipo de equipamento');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const modelo = await nr12Api.modelos.create(formData);
      toast.success('Modelo cadastrado com sucesso!');
      router.push(`/dashboard/nr12/modelos/${modelo.id}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao cadastrar modelo';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingTipos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/nr12/modelos" className="hover:text-purple-600">
            Modelos
          </Link>
          <span>/</span>
          <span>Novo Modelo</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Modelo de Checklist</h1>
        <p className="text-gray-600 mt-1">
          Crie um template de checklist vinculado a um tipo de equipamento
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Seção: Informações Básicas */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
            <div className="grid grid-cols-1 gap-4">
              {/* Tipo de Equipamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Equipamento *
                </label>
                <select
                  name="tipo_equipamento"
                  value={formData.tipo_equipamento || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                >
                  <option value="">Selecione um tipo...</option>
                  {tipos.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  O checklist será aplicável a equipamentos deste tipo
                </p>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Modelo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                  placeholder="Ex: Checklist Diário - Escavadeira Hidráulica"
                />
              </div>

              {/* Periodicidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodicidade *
                </label>
                <select
                  name="periodicidade"
                  value={formData.periodicidade}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                >
                  <option value="DIARIO">Diário</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINZENAL">Quinzenal</option>
                  <option value="MENSAL">Mensal</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Com que frequência este checklist deve ser realizado
                </p>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                  placeholder="Descreva o objetivo e escopo deste checklist..."
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações</h2>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="ativo"
                  checked={formData.ativo}
                  onChange={handleChange}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  id="ativo"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Modelo ativo
                </label>
                <p className="text-sm text-gray-500">
                  Modelos inativos não aparecem para seleção ao criar novos checklists
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="flex">
              <span className="text-2xl mr-3">💡</span>
              <div>
                <h3 className="text-sm font-medium text-blue-800">Próximo Passo</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Após salvar o modelo, você poderá adicionar os itens do checklist 
                  (perguntas, verificações, medições, etc.)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <Link
            href="/dashboard/nr12/modelos"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar e Adicionar Itens'}
          </button>
        </div>
      </form>
    </div>
  );
}