'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fioDiamantadoApi, clientesApi, Cliente } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function NovoFioDiamantadoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isCliente = user?.profile?.role === 'CLIENTE';

  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formData, setFormData] = useState({
    cliente: '',
    codigo: '',
    fabricante: '',
    numero_serie: '',
    comprimento_metros: '',
    perolas_por_metro: '',
    diametro_inicial_mm: '',
    diametro_minimo_mm: '6.0',
    status: 'ATIVO',
    observacoes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isCliente) {
      loadClientes();
    }
  }, [isCliente]);

  async function loadClientes() {
    try {
      const res = await clientesApi.list({ page_size: 100 });
      setClientes(res.results || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.codigo || !formData.fabricante || !formData.comprimento_metros ||
        !formData.perolas_por_metro || !formData.diametro_inicial_mm) {
      setError('Preencha todos os campos obrigatorios');
      return;
    }

    if (!isCliente && !formData.cliente) {
      setError('Selecione um cliente');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        codigo: formData.codigo,
        fabricante: formData.fabricante,
        numero_serie: formData.numero_serie,
        comprimento_metros: parseFloat(formData.comprimento_metros),
        perolas_por_metro: parseInt(formData.perolas_por_metro),
        diametro_inicial_mm: parseFloat(formData.diametro_inicial_mm),
        diametro_minimo_mm: parseFloat(formData.diametro_minimo_mm),
        status: formData.status,
        observacoes: formData.observacoes,
      };

      if (!isCliente) {
        payload.cliente = parseInt(formData.cliente);
      }

      await fioDiamantadoApi.fios.create(payload);
      router.push('/dashboard/fio-diamantado');
    } catch (error: any) {
      console.error('Erro ao criar fio:', error);
      setError(error.message || 'Erro ao cadastrar fio diamantado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/fio-diamantado" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Fio Diamantado</h1>
        <p className="text-sm text-gray-500 mt-1">Cadastre um novo fio diamantado no sistema</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Cliente */}
        {!isCliente && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            <select
              name="cliente"
              value={formData.cliente}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_razao}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Identificacao */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Codigo do Fio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              placeholder="Ex: FD-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fabricante <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fabricante"
              value={formData.fabricante}
              onChange={handleChange}
              placeholder="Ex: Diamond Wire Co."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numero de Serie
          </label>
          <input
            type="text"
            name="numero_serie"
            value={formData.numero_serie}
            onChange={handleChange}
            placeholder="Opcional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Especificacoes */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Especificacoes Tecnicas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprimento (metros) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="comprimento_metros"
                value={formData.comprimento_metros}
                onChange={handleChange}
                placeholder="Ex: 100.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perolas por Metro <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                name="perolas_por_metro"
                value={formData.perolas_por_metro}
                onChange={handleChange}
                placeholder="Ex: 40"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diametro Inicial (mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="diametro_inicial_mm"
                value={formData.diametro_inicial_mm}
                onChange={handleChange}
                placeholder="Ex: 11.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diametro Minimo (mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="diametro_minimo_mm"
                value={formData.diametro_minimo_mm}
                onChange={handleChange}
                placeholder="Ex: 6.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Diametro minimo antes da substituicao</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ATIVO">Ativo</option>
            <option value="MANUTENCAO">Em Manutencao</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>
        </div>

        {/* Observacoes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
          <textarea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            rows={3}
            placeholder="Observacoes adicionais..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Botoes */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/fio-diamantado"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Salvando...' : 'Salvar Fio'}
          </button>
        </div>
      </form>
    </div>
  );
}
