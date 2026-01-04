// frontend/src/app/dashboard/operadores/novo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { operadoresApi, cadastroApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function NovoOperadorPage() {
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
  const [clientesSelecionados, setClientesSelecionados] = useState<number[]>([]);
  const [empreendimentosSelecionados, setEmpreendimentosSelecionados] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [clientes, setClientes] = useState<any[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');

  const onlyDigits = (s: string) => s.replace(/\D/g, '');

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    if (clienteSelecionado) {
      carregarEmpreendimentos(clienteSelecionado);
    } else {
      setEmpreendimentos([]);
    }
  }, [clienteSelecionado]);

  const carregarClientes = async () => {
    try {
      const response = await cadastroApi.clientes.list();
      setClientes(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const carregarEmpreendimentos = async (clienteId: string) => {
    try {
      const response = await cadastroApi.empreendimentos.list({ cliente: Number(clienteId) });
      setEmpreendimentos(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await operadoresApi.create({
        nome_completo: nome.trim(),
        cpf: onlyDigits(cpf),
        data_nascimento: dataNascimento || undefined,
        telefone: telefone.trim() || undefined,
        logradouro: logradouro.trim() || undefined,
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        uf: uf.trim() || undefined,
        cep: cep.trim() || undefined,
        clientes_ids: clientesSelecionados,
        empreendimentos_ids: empreendimentosSelecionados,
        ativo,
      } as any);
      toast.success('Operador criado com sucesso');
      // Força reload completo da página para garantir que a listagem seja atualizada
      window.location.href = '/dashboard/operadores';
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar operador');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Operador</h1>
          <p className="text-gray-900">Cadastro básico de operador</p>
        </div>
        <Link href="/dashboard/operadores" className="text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white shadow rounded-lg p-6 space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-900">Nome completo</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">CPF</label>
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="Apenas números"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Informe 11 dígitos.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">Data de Nascimento</label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">Telefone</label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-gray-900"
          />
        </div>

        <div className="pt-2 border-t mt-4">
          <h2 className="text-md font-semibold text-gray-900 mb-3">Vinculação</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Cliente</label>
              <select
                value={clienteSelecionado}
                onChange={(e) => {
                  setClienteSelecionado(e.target.value);
                  if (e.target.value && !clientesSelecionados.includes(Number(e.target.value))) {
                    setClientesSelecionados([...clientesSelecionados, Number(e.target.value)]);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome_razao}
                  </option>
                ))}
              </select>
              {clientesSelecionados.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {clientesSelecionados.map((id) => {
                    const cliente = clientes.find(c => c.id === id);
                    return cliente ? (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {cliente.nome_razao}
                        <button
                          type="button"
                          onClick={() => setClientesSelecionados(clientesSelecionados.filter(c => c !== id))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Empreendimentos</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !empreendimentosSelecionados.includes(Number(e.target.value))) {
                    setEmpreendimentosSelecionados([...empreendimentosSelecionados, Number(e.target.value)]);
                  }
                }}
                disabled={!clienteSelecionado}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 disabled:bg-gray-100"
              >
                <option value="">Selecione um empreendimento</option>
                {empreendimentos.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome}
                  </option>
                ))}
              </select>
              {empreendimentosSelecionados.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {empreendimentosSelecionados.map((id) => {
                    const emp = empreendimentos.find(e => e.id === id);
                    return emp ? (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {emp.nome}
                        <button
                          type="button"
                          onClick={() => setEmpreendimentosSelecionados(empreendimentosSelecionados.filter(e => e !== id))}
                          className="text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
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
