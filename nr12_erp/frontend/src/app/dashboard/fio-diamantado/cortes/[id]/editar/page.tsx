'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fioDiamantadoApi, RegistroCorte } from '@/lib/api';

export default function EditarCortePage() {
  const router = useRouter();
  const params = useParams();
  const corteId = params.id as string;

  const [corte, setCorte] = useState<RegistroCorte | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    data: '',
    hora_inicial: '',
    horimetro_inicial: '',
    diametro_inicial_mm: '',
    operador_nome: '',
    observacoes: '',
  });

  useEffect(() => {
    loadCorte();
  }, [corteId]);

  async function loadCorte() {
    try {
      setLoading(true);
      const data = await fioDiamantadoApi.cortes.get(parseInt(corteId));
      setCorte(data);

      setFormData({
        data: data.data || '',
        hora_inicial: data.hora_inicial || '',
        horimetro_inicial: data.horimetro_inicial?.toString() || '',
        diametro_inicial_mm: data.diametro_inicial_mm?.toString() || '',
        operador_nome: data.operador_nome || '',
        observacoes: data.observacoes || '',
      });
    } catch (err) {
      console.error('Erro ao carregar corte:', err);
      setError('Erro ao carregar dados do corte');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.data || !formData.hora_inicial || !formData.horimetro_inicial || !formData.diametro_inicial_mm) {
      setError('Preencha todos os campos obrigatorios');
      return;
    }

    try {
      setSaving(true);
      await fioDiamantadoApi.cortes.update(parseInt(corteId), {
        data: formData.data,
        hora_inicial: formData.hora_inicial,
        horimetro_inicial: parseFloat(formData.horimetro_inicial),
        diametro_inicial_mm: parseFloat(formData.diametro_inicial_mm),
        operador_nome: formData.operador_nome || undefined,
        observacoes: formData.observacoes || undefined,
      });
      router.push('/dashboard/fio-diamantado');
    } catch (err: any) {
      console.error('Erro ao atualizar corte:', err);
      setError(err.message || 'Erro ao atualizar corte');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!corte) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Corte nao encontrado</p>
        <Link href="/dashboard/fio-diamantado" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Voltar
        </Link>
      </div>
    );
  }

  // Nao permitir edicao de cortes finalizados
  if (corte.status === 'FINALIZADO') {
    return (
      <div className="text-center py-20">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Corte Finalizado</h2>
          <p className="text-yellow-700 text-sm mb-4">Cortes finalizados nao podem ser editados.</p>
          <Link href="/dashboard/fio-diamantado" className="text-blue-600 hover:text-blue-800">
            Voltar para lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/fio-diamantado" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Corte</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fio: {corte.fio_codigo} | Maquina: {corte.maquina_codigo}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Info do Corte */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Informacoes do Corte</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">Fio</dt>
              <dd className="font-medium text-gray-900">{corte.fio_codigo}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Maquina</dt>
              <dd className="font-medium text-gray-900">{corte.maquina_codigo}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Empreendimento</dt>
              <dd className="font-medium text-gray-900">{corte.empreendimento_nome}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-gray-900">{corte.status_display}</dd>
            </div>
          </dl>
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="data"
              value={formData.data}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Hora Inicial <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="hora_inicial"
              value={formData.hora_inicial}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              required
            />
          </div>
        </div>

        {/* Medicoes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Horimetro Inicial <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="horimetro_inicial"
              value={formData.horimetro_inicial}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Diametro Inicial (mm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="diametro_inicial_mm"
              value={formData.diametro_inicial_mm}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              required
            />
          </div>
        </div>

        {/* Operador */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Nome do Operador
          </label>
          <input
            type="text"
            name="operador_nome"
            value={formData.operador_nome}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>

        {/* Observacoes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Observacoes
          </label>
          <textarea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>

        {/* Botoes */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/fio-diamantado"
            className="px-4 py-2 text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Salvando...' : 'Salvar Alteracoes'}
          </button>
        </div>
      </form>
    </div>
  );
}
