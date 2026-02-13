// frontend/src/app/dashboard/operadores/[id]/editar/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { operadoresApi, Operador, api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

export default function EditarOperadorPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const id = Number(params?.id);

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');

  // Estados para gerenciar acesso
  const [username, setUsername] = useState('');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [resetPasswordResult, setResetPasswordResult] = useState<{senha?: string, sucesso: boolean} | null>(null);

  const isAdmin = user?.profile?.role === 'ADMIN';

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await operadoresApi.retrieve(id);
        setNome(data.nome_completo);
        setCpf(data.cpf);
        setTelefone(data.telefone || '');
        setAtivo(!!data.ativo);
        setDataNascimento((data as any).data_nascimento || '');
        setLogradouro(data.logradouro || '');
        setNumero(data.numero || '');
        setComplemento(data.complemento || '');
        setBairro(data.bairro || '');
        setCidade(data.cidade || '');
        setUf(data.uf || '');
        setCep(data.cep || '');
        setUsername((data as any).user_username || '');
      } catch (e: any) {
        toast.error(e.message || 'Erro ao carregar operador');
        router.push('/dashboard/operadores');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleResetPassword = async () => {
    setResetPasswordLoading(true);
    setResetPasswordResult(null);

    try {
      const body = novaSenha ? { senha: novaSenha } : {};
      const response = await fetch(`/api/proxy/operadores/${id}/resetar_senha/`, {
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
          senha: data.senha_gerada_automaticamente ? data.nova_senha : undefined,
          sucesso: true
        });
        if (data.username) {
          setUsername(data.username);
        }
        toast.success(data.detail || 'Senha resetada com sucesso!');
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const onlyDigits = (s: string) => s.replace(/\D/g, '');
      const payload: Partial<Operador> = {
        nome_completo: nome.trim(),
        cpf: onlyDigits(cpf),
        data_nascimento: dataNascimento || undefined,
        telefone: telefone.trim() || undefined,
        ativo,
        logradouro: logradouro.trim() || undefined,
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        uf: uf.trim() || undefined,
        cep: cep.trim() || undefined,
      } as any;
      await operadoresApi.update(id, payload);
      toast.success('Operador atualizado');
      router.push(`/dashboard/operadores/${id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar operador');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Operador #{id}</h1>
          <p className="text-gray-900">Atualize os dados do operador</p>
        </div>
        <Link href={`/dashboard/operadores/${id}`} className="text-blue-600 hover:underline">Cancelar</Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white shadow rounded-lg p-6 space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-900">Nome completo</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">CPF</label>
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">Data de Nascimento</label>
          <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">Telefone</label>
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" />
        </div>
        <div className="flex items-center gap-2">
          <input id="ativo" type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <label htmlFor="ativo" className="text-sm text-gray-900">Ativo</label>
        </div>

        <div className="pt-2 border-t mt-4">
          <h2 className="text-md font-semibold text-gray-900 mb-2">Endereço</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-gray-900">Logradouro</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" value={logradouro} onChange={(e)=>setLogradouro(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-900">Número</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" value={numero} onChange={(e)=>setNumero(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-900">Complemento</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" value={complemento} onChange={(e)=>setComplemento(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-900">Bairro</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" value={bairro} onChange={(e)=>setBairro(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-900">Cidade</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" value={cidade} onChange={(e)=>setCidade(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-900">UF</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" value={uf} onChange={(e)=>setUf(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-900">CEP</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900" value={cep} onChange={(e)=>setCep(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Seção: Gerenciar Acesso */}
        {isAdmin && (
          <div className="pt-4 border-t mt-4">
            <h2 className="text-md font-semibold text-gray-900 mb-3">Gerenciar Acesso</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Credenciais de Acesso</p>
                  {username ? (
                    <p className="text-xs text-gray-600 mt-1">
                      Username: <span className="font-mono bg-white px-2 py-1 rounded border">{username}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600 mt-1">
                      Nenhum usuário vinculado. Clique em &quot;Criar Acesso&quot; para gerar login.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(true)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {username ? 'Resetar Senha' : 'Criar Acesso'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4">
          <button type="submit" disabled={saving || !nome.trim() || cpf.trim().length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {/* Modal Resetar Senha */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {username ? 'Resetar Senha do Operador' : 'Criar Acesso do Operador'}
              </h3>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Operador: <strong>{nome}</strong>
              </p>
              {username && (
                <p className="text-sm text-gray-600 mb-4">
                  Username: <strong className="font-mono">{username}</strong>
                </p>
              )}
              {!username && (
                <p className="text-sm text-gray-600 mb-4">
                  O username será o CPF do operador (apenas números).
                </p>
              )}

              {/* Result Display */}
              {resetPasswordResult?.sucesso && resetPasswordResult.senha && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-900 mb-2">Senha gerada com sucesso!</p>
                  <p className="text-xs text-green-800 mb-2">Copie e envie para o operador:</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
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
                  ⚠️ <strong>Atenção:</strong> {username
                    ? 'Esta ação irá alterar a senha do operador.'
                    : 'Esta ação criará um usuário para o operador acessar o sistema.'}
                  {' '}Certifique-se de comunicar as credenciais ao operador.
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
                  {resetPasswordLoading ? 'Processando...' : (username ? 'Resetar Senha' : 'Criar Acesso')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
