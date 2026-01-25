// frontend/src/app/dashboard/clientes/[id]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

interface Assinatura {
  id: number
  plano: number
  plano_nome: string
  status: string
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const clienteId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<Cliente>>({});
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [resetPasswordResult, setResetPasswordResult] = useState<{senha?: string, sucesso: boolean} | null>(null);

  // Estados para gerenciar plano
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  const [changePlanLoading, setChangePlanLoading] = useState(false);

  useEffect(() => {
    console.log('🔍 [Editar Cliente] User:', user);
    console.log('🔑 [Editar Cliente] User role:', user?.profile?.role);
    loadCliente();
    if (user?.profile?.role === 'ADMIN') {
      console.log('✅ [Editar Cliente] User é ADMIN - carregando planos e assinatura');
      loadPlanos();
      loadAssinatura();
    }
  }, [clienteId, user]);

  const loadCliente = async () => {
    try {
      setLoading(true);
      const cliente = await clientesApi.get(clienteId);
      setFormData(cliente);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cliente');
      toast.error('Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  };

  const loadPlanos = async () => {
    try {
      console.log('🔍 [Editar Cliente] Carregando planos...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/planos/`, {
        credentials: 'include'
      });
      console.log('📡 [Editar Cliente] Planos response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        // API retorna objeto paginado {results: [...]}
        const planosList = data.results || data;
        console.log('✅ [Editar Cliente] Planos carregados:', planosList.length, 'planos');
        setPlanos(planosList);
      }
    } catch (err) {
      console.error('❌ [Editar Cliente] Erro ao carregar planos:', err);
    }
  };

  const loadAssinatura = async () => {
    try {
      console.log('🔍 [Editar Cliente] Carregando assinatura do cliente:', clienteId);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cadastro/assinaturas/?cliente=${clienteId}`,
        { credentials: 'include' }
      );
      console.log('📡 [Editar Cliente] Assinatura response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📋 [Editar Cliente] Assinatura data:', data);
        // API retorna objeto paginado {results: [...]}
        const assinaturasList = data.results || data;
        console.log('📋 [Editar Cliente] Assinaturas encontradas:', assinaturasList.length);
        if (assinaturasList.length > 0) {
          console.log('✅ [Editar Cliente] Assinatura:', assinaturasList[0]);
          setAssinatura(assinaturasList[0]);
          setSelectedPlanoId(assinaturasList[0].plano);
        } else {
          console.log('⚠️ [Editar Cliente] Nenhuma assinatura encontrada para este cliente');
        }
      }
    } catch (err) {
      console.error('❌ [Editar Cliente] Erro ao carregar assinatura:', err);
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
    setSaving(true);
    setError('');

    try {
      await clientesApi.update(clienteId, formData);
      toast.success('Cliente atualizado com sucesso!');
      router.push('/dashboard/clientes');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar cliente';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetPasswordLoading(true);
    setResetPasswordResult(null);

    try {
      const body = novaSenha ? { senha: novaSenha } : {};
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cadastro/clientes/${clienteId}/resetar_senha/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setResetPasswordResult({
          senha: data.senha_gerada_automaticamente ? data.senha : undefined,
          sucesso: true
        });
        toast.success('Senha resetada com sucesso!');
        setNovaSenha('');
      } else {
        toast.error(data.detail || 'Erro ao resetar senha');
        setResetPasswordResult({ sucesso: false });
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor');
      setResetPasswordResult({ sucesso: false });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!assinatura || !selectedPlanoId) return;

    setChangePlanLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cadastro/assinaturas/${assinatura.id}/alterar_plano/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ plano_id: selectedPlanoId })
        }
      );

      if (response.ok) {
        toast.success('Plano alterado com sucesso!');
        setShowChangePlanModal(false);
        await loadAssinatura(); // Recarrega a assinatura
        await loadCliente(); // Recarrega o cliente para atualizar dados do plano
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Erro ao alterar plano');
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setChangePlanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando cliente...</p>
        </div>
      </div>
    );
  }

  if (!formData.id) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Cliente não encontrado</p>
        <Link href="/dashboard/clientes" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista de clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-900 mb-2">
          <Link href="/dashboard/clientes" className="hover:text-blue-600">
            Clientes
          </Link>
          <span>/</span>
          <span>{formData.nome_razao}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pessoa *
                </label>
                <select
                  name="tipo_pessoa"
                  value={formData.tipo_pessoa}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  <option value="PJ">Pessoa Jurídica</option>
                  <option value="PF">Pessoa Física</option>
                </select>
              </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}
                </label>
                <input
                  type="text"
                  name="documento"
                  value={formData.documento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                />
              </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Seção: Contato */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contato</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Financeiro
                </label>
                <input
                  type="email"
                  name="email_financeiro"
                  value={formData.email_financeiro}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Seção: Endereço */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                  <input
                    type="text"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                  <select
                    name="uf"
                    value={formData.uf}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
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

          {/* Gerenciar Acesso */}
          {user?.profile?.role === 'ADMIN' && formData.username && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Gerenciar Acesso</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Credenciais de Acesso</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Username: <span className="font-mono bg-white px-2 py-1 rounded border">{formData.username}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(true)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Resetar Senha
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Plano de Assinatura */}
          {user?.profile?.role === 'ADMIN' && assinatura && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Plano de Assinatura</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Plano Atual</p>
                    <p className="text-lg font-semibold text-blue-600 mt-1">{assinatura.plano_nome}</p>
                    <p className="text-xs text-gray-600 mt-1">Status: <span className="font-medium">{assinatura.status}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChangePlanModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Alterar Plano
                  </button>
                </div>
              </div>
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 text-gray-900 placeholder:text-gray-900"
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

      {/* Modal Resetar Senha */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Resetar Senha do Cliente</h3>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Cliente: <strong>{formData.nome_razao}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Username: <strong className="font-mono">{formData.username}</strong>
              </p>

              {/* Result Display */}
              {resetPasswordResult?.sucesso && resetPasswordResult.senha && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-900 mb-2">Senha gerada com sucesso!</p>
                  <p className="text-xs text-green-800 mb-2">Copie e envie para o cliente:</p>
                  <div className="bg-white p-3 rounded border border-green-300">
                    <code className="text-lg font-mono font-bold text-green-900">{resetPasswordResult.senha}</code>
                  </div>
                </div>
              )}

              {/* Input Nova Senha */}
              {!resetPasswordResult && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha (opcional)
                  </label>
                  <input
                    type="text"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Deixe vazio para gerar senha aleatória"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    disabled={resetPasswordLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo de 6 caracteres. Se deixar em branco, uma senha aleatória será gerada.
                  </p>
                </div>
              )}

              {/* Warning */}
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> Esta ação irá alterar a senha do cliente.
                  Certifique-se de comunicar a nova senha ao cliente.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setNovaSenha('');
                  setResetPasswordResult(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={resetPasswordLoading}
              >
                {resetPasswordResult?.sucesso ? 'Fechar' : 'Cancelar'}
              </button>
              {!resetPasswordResult?.sucesso && (
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={resetPasswordLoading}
                >
                  {resetPasswordLoading ? 'Resetando...' : 'Resetar Senha'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Alterar Plano */}
      {showChangePlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Alterar Plano de Assinatura</h3>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Cliente: <strong>{formData.nome_razao}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Plano atual: <strong className="text-blue-600">{assinatura?.plano_nome}</strong>
              </p>

              {/* Lista de Planos */}
              <div className="space-y-3">
                {planos.map((plano) => (
                  <label
                    key={plano.id}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPlanoId === plano.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plano"
                      value={plano.id}
                      checked={selectedPlanoId === plano.id}
                      onChange={() => setSelectedPlanoId(plano.id)}
                      className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{plano.nome}</p>
                        <p className="text-sm font-bold text-indigo-600">
                          R$ {parseFloat(plano.valor_mensal).toFixed(2)}/mês
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{plano.descricao}</p>
                      {plano.id === assinatura?.plano && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          Plano Atual
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Warning */}
              <div className="mt-6 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-xs text-indigo-800">
                  ℹ️ <strong>Atenção:</strong> Ao alterar o plano, os módulos habilitados e limites
                  de recursos serão atualizados imediatamente.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowChangePlanModal(false);
                  setSelectedPlanoId(assinatura?.plano || null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={changePlanLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePlan}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={changePlanLoading || selectedPlanoId === assinatura?.plano}
              >
                {changePlanLoading ? 'Alterando...' : 'Alterar Plano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}