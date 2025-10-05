// frontend/src/app/dashboard/equipamentos/novo/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { equipamentosApi, clientesApi, empreendimentosApi, tiposEquipamentoApi, Equipamento, Cliente, Empreendimento, TipoEquipamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function NovoEquipamentoPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);

  const [formData, setFormData] = useState<Partial<Equipamento>>({
    cliente: undefined,
    empreendimento: undefined,
    tipo: undefined,
    codigo: '',
    descricao: '',
    fabricante: '',
    modelo: '',
    ano_fabricacao: null,
    numero_serie: '',
    tipo_medicao: 'HORA',
    leitura_atual: '0',
    ativo: true,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.cliente) {
      loadEmpreendimentos(Number(formData.cliente));
    } else {
      setEmpreendimentos([]);
      setFormData(prev => ({ ...prev, empreendimento: undefined }));
    }
  }, [formData.cliente]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [clientesRes, tiposRes] = await Promise.all([
        clientesApi.list(),
        tiposEquipamentoApi.list(),
      ]);
      setClientes(clientesRes.results);
      setTipos(tiposRes.results);
    } catch (err: any) {
      toast.error('Erro ao carregar dados iniciais');
    } finally {
      setLoadingData(false);
    }
  };

  const loadEmpreendimentos = async (clienteId: number) => {
    try {
      const response = await empreendimentosApi.list({ cliente: clienteId });
      setEmpreendimentos(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar empreendimentos');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              ['cliente', 'empreendimento', 'tipo', 'ano_fabricacao'].includes(name) ? 
              (value === '' ? null : Number(value)) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.cliente) {
      toast.error('Selecione um cliente');
      return;
    }

    if (!formData.empreendimento) {
      toast.error('Selecione um empreendimento');
      return;
    }

    if (!formData.tipo) {
      toast.error('Selecione um tipo de equipamento');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await equipamentosApi.create(formData);
      toast.success('Equipamento cadastrado com sucesso!');
      router.push('/dashboard/equipamentos');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao cadastrar equipamento';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          <Link href="/dashboard/equipamentos" className="hover:text-blue-600">
            Equipamentos
          </Link>
          <span>/</span>
          <span>Novo Equipamento</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Equipamento</h1>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Seção: Localização */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Localização</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  name="cliente"
                  value={formData.cliente || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome_razao}
                    </option>
                  ))}
                </select>
              </div>

              {/* Empreendimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empreendimento *
                </label>
                <select
                  name="empreendimento"
                  value={formData.empreendimento || ''}
                  onChange={handleChange}
                  required
                  disabled={!formData.cliente}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.cliente ? 'Selecione um empreendimento...' : 'Selecione um cliente primeiro'}
                  </option>
                  {empreendimentos.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção: Identificação */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Identificação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="Ex: EQ-001"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Equipamento *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  <option value="">Selecione um tipo...</option>
                  {tipos.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="Ex: Escavadeira Hidráulica"
                />
              </div>
            </div>
          </div>

          {/* Seção: Dados Técnicos */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Técnicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fabricante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabricante
                </label>
                <input
                  type="text"
                  name="fabricante"
                  value={formData.fabricante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="Ex: Caterpillar"
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="Ex: 320D2"
                />
              </div>

              {/* Ano */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano de Fabricação
                </label>
                <input
                  type="number"
                  name="ano_fabricacao"
                  value={formData.ano_fabricacao || ''}
                  onChange={handleChange}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="Ex: 2020"
                />
              </div>

              {/* Número de Série */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Série
                </label>
                <input
                  type="text"
                  name="numero_serie"
                  value={formData.numero_serie}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="Ex: ABC123456"
                />
              </div>
            </div>
          </div>

          {/* Seção: Controle de Medição */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Controle de Medição</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Medição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Medição *
                </label>
                <select
                  name="tipo_medicao"
                  value={formData.tipo_medicao}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  <option value="HORA">Horímetro (horas)</option>
                  <option value="KM">Quilômetro (km)</option>
                </select>
              </div>

              {/* Leitura Atual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leitura Atual ({formData.tipo_medicao === 'KM' ? 'km' : 'horas'})
                </label>
                <input
                  type="number"
                  name="leitura_atual"
                  value={formData.leitura_atual}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="0.00"
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
              <span className="ml-2 text-sm text-gray-700">Equipamento ativo</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <Link
            href="/dashboard/equipamentos"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Equipamento'}
          </button>
        </div>
      </form>
    </div>
  );
}