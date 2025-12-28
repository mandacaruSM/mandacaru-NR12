// frontend/src/app/dashboard/nr12/modelos/[id]/editar/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { nr12Api, tiposEquipamentoApi, ModeloChecklist, TipoEquipamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function EditarModeloPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const modeloId = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Partial<ModeloChecklist>>({
    tipo_equipamento: undefined,
    nome: '',
    descricao: '',
    periodicidade: 'DIARIO', // ✅ CORRIGIDO: Tipo correto
    ativo: true,
  });

  useEffect(() => {
    loadData();
  }, [modeloId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [modelo, tiposRes] = await Promise.all([
        nr12Api.modelos.get(modeloId),
        tiposEquipamentoApi.list(),
      ]);
      
      setFormData({
        tipo_equipamento: modelo.tipo_equipamento,
        nome: modelo.nome,
        descricao: modelo.descricao,
        periodicidade: modelo.periodicidade,
        ativo: modelo.ativo,
      });
      
      setTipos(tiposRes.results);
    } catch (err: any) {
      toast.error('Erro ao carregar modelo');
      setError(err.message);
    } finally {
      setLoadingData(false);
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
      await nr12Api.modelos.update(modeloId, formData);
      toast.success('Modelo atualizado com sucesso!');
      router.push(`/dashboard/nr12/modelos/${modeloId}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar modelo';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-900 mb-2">
          <Link href="/dashboard/nr12" className="hover:text-purple-600">NR12</Link>
          <span>/</span>
          <Link href="/dashboard/nr12/modelos" className="hover:text-purple-600">Modelos</Link>
          <span>/</span>
          <Link href={`/dashboard/nr12/modelos/${modeloId}`} className="hover:text-purple-600">
            Detalhes
          </Link>
          <span>/</span>
          <span>Editar</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Modelo de Checklist</h1>
        <p className="text-gray-900 mt-1">Atualize as informações do modelo</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Equipamento */}
              <div>
                <label htmlFor="tipo_equipamento" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Equipamento *
                </label>
                <select
                  id="tipo_equipamento"
                  name="tipo_equipamento"
                  value={formData.tipo_equipamento || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Selecione...</option>
                  {tipos.filter(t => t.ativo).map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Periodicidade */}
              <div>
                <label htmlFor="periodicidade" className="block text-sm font-medium text-gray-700 mb-2">
                  Periodicidade *
                </label>
                <select
                  id="periodicidade"
                  name="periodicidade"
                  value={formData.periodicidade || 'DIARIO'}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value="DIARIO">Diário</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINZENAL">Quinzenal</option>
                  <option value="MENSAL">Mensal</option>
                </select>
              </div>
            </div>

            {/* Nome */}
            <div className="mt-4">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Modelo *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome || ''}
                onChange={handleChange}
                required
                maxLength={150}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="Ex: Checklist Diário de Escavadeira"
              />
            </div>

            {/* Descrição */}
            <div className="mt-4">
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="Descreva o propósito deste checklist"
              />
            </div>

            {/* Status */}
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="ativo"
                  checked={formData.ativo || false}
                  onChange={handleChange}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Modelo ativo</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Modelos inativos não aparecem para seleção ao criar novos checklists
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3 rounded-b-lg">
          <Link
            href={`/dashboard/nr12/modelos/${modeloId}`}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}