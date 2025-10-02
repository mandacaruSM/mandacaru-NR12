// frontend/src/app/dashboard/empreendimentos/[id]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { empreendimentosApi, clientesApi, Empreendimento, Cliente } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const TIPO_OPTIONS = [
  { value: 'LAVRA', label: 'Lavra' },
  { value: 'OBRA', label: 'Obra' },
  { value: 'PLANTA', label: 'Planta' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function EditarEmpreendimentoPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const empreendimentoId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formData, setFormData] = useState<Partial<Empreendimento>>({});

  useEffect(() => {
    loadClientes();
    loadEmpreendimento();
  }, [empreendimentoId]);

  const loadClientes = async () => {
    try {
      const response = await clientesApi.list();
      setClientes(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const loadEmpreendimento = async () => {
    try {
      setLoading(true);
      const empreendimento = await empreendimentosApi.get(empreendimentoId);
      setFormData(empreendimento);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar empreendimento');
      toast.error('Erro ao carregar empreendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'cliente' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await empreendimentosApi.update(empreendimentoId, formData);
      toast.success('Empreendimento atualizado com sucesso!');
      router.push('/dashboard/empreendimentos');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar empreendimento';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando empreendimento...</p>
        </div>
      </div>
    );
  }

  if (!formData.id) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Empreendimento não encontrado</p>
        <Link href="/dashboard/empreendimentos" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista de empreendimentos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/empreendimentos" className="hover:text-blue-600">
            Empreendimentos
          </Link>
          <span>/</span>
          <span>{formData.nome}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Empreendimento</h1>
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
              {/* Cliente */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  name="cliente"
                  value={formData.cliente || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome_razao}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Empreendimento *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIPO_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Distância */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distância (km)
                </label>
                <input
                  type="number"
                  name="distancia_km"
                  value={formData.distancia_km}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Seção: Localização */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Localização (Opcional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latitude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude || ''}
                  onChange={handleChange}
                  step="0.000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: -12.971891"
                />
              </div>

              {/* Longitude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude || ''}
                  onChange={handleChange}
                  step="0.000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: -38.501617"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="ativo"
                checked={formData.ativo}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Empreendimento ativo</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <Link
            href="/dashboard/empreendimentos"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}