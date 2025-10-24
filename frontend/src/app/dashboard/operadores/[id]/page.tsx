// frontend/src/app/dashboard/operadores/[id]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { operadoresApi, Operador } from '@/lib/api/operadores';
import { useToast } from '@/contexts/ToastContext';

const UF_OPTIONS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export default function EditarOperadorPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const operadorId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Operador>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadOperador();
  }, [operadorId]);

  const loadOperador = async () => {
    try {
      setLoading(true);
      const operador = await operadoresApi.get(operadorId);
      setFormData(operador);
    } catch (error: any) {
      toast.error('Erro ao carregar operador');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome_completo?.trim()) newErrors.nome_completo = 'Nome é obrigatório';
    if (!formData.cpf?.trim()) newErrors.cpf = 'CPF é obrigatório';
    if (!formData.email?.trim()) newErrors.email = 'Email é obrigatório';
    if (!formData.telefone?.trim()) newErrors.telefone = 'Telefone é obrigatório';
    if (!formData.data_nascimento) newErrors.data_nascimento = 'Data de nascimento é obrigatória';
    if (!formData.logradouro?.trim()) newErrors.logradouro = 'Logradouro é obrigatório';
    if (!formData.numero?.trim()) newErrors.numero = 'Número é obrigatório';
    if (!formData.bairro?.trim()) newErrors.bairro = 'Bairro é obrigatório';
    if (!formData.cidade?.trim()) newErrors.cidade = 'Cidade é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);

    try {
      await operadoresApi.update(operadorId, formData);
      toast.success('Operador atualizado com sucesso!');
      router.push('/dashboard/operadores');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Erro ao atualizar operador';
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleGerarCodigo = async () => {
    try {
      const result = await operadoresApi.gerarCodigoVinculacao(operadorId);
      toast.success(`Código gerado: ${result.codigo}`);
      loadOperador(); // Recarrega para mostrar o código
    } catch (error: any) {
      toast.error('Erro ao gerar código');
    }
  };

  const handleDesvincularTelegram = async () => {
    if (!confirm('Desvincu lar Telegram deste operador?')) return;

    try {
      await operadoresApi.desvincularTelegram(operadorId);
      toast.success('Telegram desvinculado com sucesso!');
      loadOperador();
    } catch (error: any) {
      toast.error('Erro ao desvincular Telegram');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-center text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/operadores" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Editar Operador</h1>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-4xl">
        {/* Dados Pessoais */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b">Dados Pessoais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
              <input
                type="text"
                name="nome_completo"
                value={formData.nome_completo}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.nome_completo ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.nome_completo && <p className="text-red-500 text-sm mt-1">{errors.nome_completo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CPF *</label>
              <input
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cpf ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.telefone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento *</label>
              <input
                type="date"
                name="data_nascimento"
                value={formData.data_nascimento}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.data_nascimento ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.data_nascimento && <p className="text-red-500 text-sm mt-1">{errors.data_nascimento}</p>}
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro *</label>
              <input
                type="text"
                name="logradouro"
                value={formData.logradouro}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.logradouro ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.logradouro && <p className="text-red-500 text-sm mt-1">{errors.logradouro}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.numero ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.numero && <p className="text-red-500 text-sm mt-1">{errors.numero}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
              <input
                type="text"
                name="complemento"
                value={formData.complemento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bairro *</label>
              <input
                type="text"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bairro ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bairro && <p className="text-red-500 text-sm mt-1">{errors.bairro}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
              <input
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cidade ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cidade && <p className="text-red-500 text-sm mt-1">{errors.cidade}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado (UF)</label>
              <select
                name="uf"
                value={formData.uf}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UF_OPTIONS.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Telegram */}
        {formData.telegram_vinculado && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b">Telegram</h2>
            <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
              <p className="text-sm text-green-800">
                <strong>Vinculado em:</strong> {new Date(formData.telegram_vinculado_em!).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm text-green-800">
                <strong>Username:</strong> @{formData.telegram_username}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDesvincularTelegram}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition"
            >
              Desvincular Telegram
            </button>
          </div>
        )}

        {!formData.telegram_vinculado && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b">Telegram</h2>
            <button
              type="button"
              onClick={handleGerarCodigo}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md transition"
            >
              Gerar Código de Vinculação
            </button>
            {formData.codigo_vinculacao && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Código de vinculação:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{formData.codigo_vinculacao}</code>
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  Válido até: {new Date(formData.codigo_valido_ate!).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b">Status</h2>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="ativo"
              checked={formData.ativo}
              onChange={handleChange}
              className="w-4 h-4 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              Operador ativo
            </label>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-4 pt-8 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-md transition"
          >
            {saving ? 'Salvando...' : 'Atualizar Operador'}
          </button>
          <Link
            href="/dashboard/operadores"
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-md transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}