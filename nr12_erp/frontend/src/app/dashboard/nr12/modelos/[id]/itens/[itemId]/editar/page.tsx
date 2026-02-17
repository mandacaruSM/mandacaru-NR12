'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { nr12Api, ItemChecklist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const CATEGORIA_LABELS: Record<string, string> = {
  'VISUAL': 'Inspeção Visual',
  'FUNCIONAL': 'Teste Funcional',
  'MEDICAO': 'Medição',
  'LIMPEZA': 'Limpeza',
  'LUBRIFICACAO': 'Lubrificação',
  'DOCUMENTACAO': 'Documentação',
  'SEGURANCA': 'Segurança',
  'OUTROS': 'Outros',
};

const TIPO_RESPOSTA_LABELS: Record<string, string> = {
  'SIM_NAO': 'Sim/Não',
  'CONFORME': 'Conforme/Não Conforme',
  'NUMERO': 'Valor Numérico',
  'TEXTO': 'Texto Livre',
};

export default function EditarItemChecklistPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const modeloId = Number(params.id);
  const itemId = Number(params.itemId);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Partial<ItemChecklist>>({
    ordem: 1,
    categoria: 'VISUAL',
    pergunta: '',
    descricao_ajuda: '',
    tipo_resposta: 'CONFORME',
    obrigatorio: true,
    requer_observacao_nao_conforme: true,
    foto_obrigatoria: false,
    ativo: true,
  });

  useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    try {
      setLoadingData(true);
      const item = await nr12Api.itens.get(itemId);
      setFormData({
        ordem: item.ordem,
        categoria: item.categoria,
        pergunta: item.pergunta,
        descricao_ajuda: item.descricao_ajuda,
        tipo_resposta: item.tipo_resposta,
        obrigatorio: item.obrigatorio,
        requer_observacao_nao_conforme: item.requer_observacao_nao_conforme,
        foto_obrigatoria: item.foto_obrigatoria,
        ativo: item.ativo,
      });
    } catch (err: any) {
      toast.error('Erro ao carregar item');
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
              name === 'ordem' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.pergunta) {
      toast.error('Preencha a pergunta do item');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await nr12Api.itens.update(itemId, formData);
      toast.success('Item atualizado com sucesso!');
      router.push(`/dashboard/nr12/modelos/${modeloId}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar item';
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
          <span>Editar Item</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Item do Checklist</h1>
        <p className="text-gray-900 mt-1">Atualize as informações do item</p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ordem */}
            <div>
              <label htmlFor="ordem" className="block text-sm font-medium text-gray-700 mb-2">
                Ordem *
              </label>
              <input
                type="number"
                id="ordem"
                name="ordem"
                value={formData.ordem || 1}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>

            {/* Categoria */}
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                id="categoria"
                name="categoria"
                value={formData.categoria || 'VISUAL'}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              >
                {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Resposta */}
            <div>
              <label htmlFor="tipo_resposta" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Resposta *
              </label>
              <select
                id="tipo_resposta"
                name="tipo_resposta"
                value={formData.tipo_resposta || 'CONFORME'}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              >
                {Object.entries(TIPO_RESPOSTA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pergunta */}
          <div>
            <label htmlFor="pergunta" className="block text-sm font-medium text-gray-700 mb-2">
              Pergunta *
            </label>
            <input
              type="text"
              id="pergunta"
              name="pergunta"
              value={formData.pergunta || ''}
              onChange={handleChange}
              required
              maxLength={255}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              placeholder="Ex: O equipamento possui extintor de incêndio?"
            />
          </div>

          {/* Descrição/Ajuda */}
          <div>
            <label htmlFor="descricao_ajuda" className="block text-sm font-medium text-gray-700 mb-2">
              Descrição/Ajuda
            </label>
            <textarea
              id="descricao_ajuda"
              name="descricao_ajuda"
              value={formData.descricao_ajuda || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              placeholder="Informações adicionais para ajudar o operador"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="obrigatorio"
                checked={formData.obrigatorio || false}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Item obrigatório</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="requer_observacao_nao_conforme"
                checked={formData.requer_observacao_nao_conforme || false}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Requer observação se não conforme</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="foto_obrigatoria"
                checked={formData.foto_obrigatoria || false}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Foto obrigatória</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="ativo"
                checked={formData.ativo || false}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Ativo</span>
            </label>
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
