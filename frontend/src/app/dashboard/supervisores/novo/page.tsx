// frontend/src/app/dashboard/supervisores/novo/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supervisoresApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function NovoSupervisorPage() {
  const router = useRouter();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');
  const [saving, setSaving] = useState(false);

  const onlyDigits = (s: string) => s.replace(/\D/g, '');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supervisoresApi.create({
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
      } as any);
      toast.success('Supervisor criado com sucesso');
      router.push('/dashboard/supervisores');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar supervisor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Supervisor</h1>
          <p className="text-gray-600">Cadastro básico de supervisor</p>
        </div>
        <Link href="/dashboard/supervisores" className="text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white shadow rounded-lg p-6 space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome completo</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CPF</label>
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="Apenas números"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Informe 11 dígitos.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <input id="ativo" type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <label htmlFor="ativo" className="text-sm text-gray-700">Ativo</label>
        </div>

        <div className="pt-2 border-t mt-4">
          <h2 className="text-md font-semibold text-gray-800 mb-2">Endereço</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-gray-700">Logradouro</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={logradouro} onChange={(e)=>setLogradouro(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Número</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={numero} onChange={(e)=>setNumero(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Complemento</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={complemento} onChange={(e)=>setComplemento(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Bairro</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={bairro} onChange={(e)=>setBairro(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Cidade</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={cidade} onChange={(e)=>setCidade(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">UF</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={uf} onChange={(e)=>setUf(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">CEP</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={cep} onChange={(e)=>setCep(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || !nome.trim() || onlyDigits(cpf).length !== 11}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
