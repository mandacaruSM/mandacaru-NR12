// frontend/src/app/dashboard/clientes/novo/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clientesApi, Cliente } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Plano {
  id: number
  nome: string
  tipo: string
  valor_mensal: string
  descricao: string
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function NovoClientePage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);

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

  useEffect(() => {
    console.log('👤 User:', user);
    console.log('🔑 User role:', user?.profile?.role);
    loadPlanos();
  }, [user]);

  const loadPlanos = async () => {
    try {
      console.log('🔍 Carregando planos...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/planos/`, {
        credentials: 'include'
      });
      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        // API retorna objeto paginado {results: [...]}
        const planosList = data.results || data;
        console.log('✅ Planos carregados:', planosList.length, 'planos');
        console.log('📋 Planos:', planosList);
        setPlanos(planosList);

        // Seleciona o plano Essencial por padrão
        const essencial = planosList.find((p: Plano) => p.tipo === 'ESSENCIAL');
        if (essencial) {
          console.log('✅ Plano Essencial selecionado:', essencial.nome);
          setSelectedPlanoId(essencial.id);
        }
      } else {
        console.error('❌ Erro ao carregar planos - Status:', response.status);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar planos:', err);
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

    console.log('📝 Dados do formulário:', formData);
    console.log('📋 Plano selecionado:', selectedPlanoId);

    try {
      console.log('🚀 Enviando requisição para criar cliente...');
      const result = await clientesApi.create(formData);
      console.log('✅ Cliente criado com sucesso:', result);

      // Se um plano foi selecionado e é diferente do padrão, atualizar a assinatura
      if (selectedPlanoId && user?.profile?.role === 'ADMIN') {
        try {
          // Buscar a assinatura criada automaticamente
          const assinaturasRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/cadastro/assinaturas/?cliente=${result.id}`,
            { credentials: 'include' }
          );

          if (assinaturasRes.ok) {
            const assinaturas = await assinaturasRes.json();
            if (assinaturas.length > 0) {
              const assinaturaId = assinaturas[0].id;

              // Alterar o plano se necessário
              const planoEssencial = planos.find(p => p.tipo === 'ESSENCIAL');
              if (planoEssencial && selectedPlanoId !== planoEssencial.id) {
                await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/cadastro/assinaturas/${assinaturaId}/alterar_plano/`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ plano_id: selectedPlanoId })
                  }
                );
                console.log('✅ Plano atualizado para:', selectedPlanoId);
              }
            }
          }
        } catch (planoErr) {
          console.error('⚠️ Erro ao atualizar plano (cliente criado com sucesso):', planoErr);
          // Não bloqueia o fluxo se falhar ao atualizar o plano
        }
      }

      toast.success('Cliente criado com sucesso');
      // Força reload completo da página para garantir que a listagem seja atualizada
      window.location.href = '/dashboard/clientes';
    } catch (err: any) {
      console.error('❌ Erro ao criar cliente:', err);
      const errorMsg = err.message || 'Erro ao cadastrar cliente';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-900 mb-2">
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

          {/* Plano de Assinatura */}
          {user?.profile?.role === 'ADMIN' && planos.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Plano de Assinatura</h2>
              <div className="space-y-3">
                {planos.map((plano) => (
                  <label
                    key={plano.id}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPlanoId === plano.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plano"
                      value={plano.id}
                      checked={selectedPlanoId === plano.id}
                      onChange={() => setSelectedPlanoId(plano.id)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{plano.nome}</p>
                        <p className="text-sm font-bold text-blue-600">
                          R$ {parseFloat(plano.valor_mensal).toFixed(2)}/mês
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{plano.descricao}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                O cliente receberá 30 dias de trial gratuito para testar o plano selecionado.
              </p>
            </div>
          )}

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