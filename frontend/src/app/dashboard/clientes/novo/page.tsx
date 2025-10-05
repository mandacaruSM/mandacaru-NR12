// frontend/src/app/dashboard/clientes/novo/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clientesApi, Cliente } from '@/lib/api';
import Link from 'next/link';

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Partial<Cliente>>({
    tipo_pessoa: 'PJ',
    nome_razao: '',
    documento: '',
    inscricao_estadual: '',
    email_financeiro: '',
    telefone: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    ativo: true,
  });

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
      await clientesApi.create(formData);
      router.push('/dashboard/clientes');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/clientes" className="hover:text-blue-600">
            Clientes
          </Link>
          <span>/</span>
          <span>Novo Cliente</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Cliente</h1>
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
          {/* Seção: Informações Básicas */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo Pessoa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pessoa *
                </label>
                <select
                  name="tipo_pessoa"
                  value={formData.tipo_pessoa}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900"
                >
                  <option value="PJ">Pessoa Jurídica</option>
                  <option value="PF">Pessoa Física</option>
                </select>
              </div>

              {/* Nome/Razão Social */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'} *
                </label>
                <input
                  type="text"
                  name="nome_razao"
                  value={formData.nome_razao}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  placeholder={formData.tipo_pessoa === 'PJ' ? 'Ex: Empresa ABC Ltda' : 'Ex: João da Silva'}
                />
              </div>

              {/* Documento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}
                </label>
                <input
                  type="text"
                  name="documento"
                  value={formData.documento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                />
              </div>

              {/* Inscrição Estadual */}
              {formData.tipo_pessoa === 'PJ' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inscrição Estadual
                  </label>
                  <input
                    type="text"
                    name="inscricao_estadual"
                    value={formData.inscricao_estadual}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Seção: Contato */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contato</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Financeiro
                </label>
                <input
                  type="email"
                  name="email_financeiro"
                  value={formData.email_financeiro}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  placeholder="contato@empresa.com"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* Seção: Endereço */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
            <div className="grid grid-cols-1 gap-4">
              {/* CEP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              {/* Logradouro e Número */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="123"
                  />
                </div>
              </div>

              {/* Complemento e Bairro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="Sala, Andar..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Cidade e UF */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UF
                  </label>
                  <select
                    name="uf"
                    value={formData.uf}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Selecione...</option>
                    {UF_OPTIONS.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
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
              <span className="ml-2 text-sm text-gray-700">Cliente ativo</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <Link
            href="/dashboard/clientes"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}