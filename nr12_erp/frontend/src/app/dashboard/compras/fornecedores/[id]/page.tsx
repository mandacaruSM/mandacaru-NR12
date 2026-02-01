'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fornecedoresApi } from '@/lib/api';

export default function EditarFornecedorPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nome: '',
    cnpj_cpf: '',
    contato: '',
    telefone: '',
    whatsapp: '',
    email: '',
    especialidade: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    observacoes: '',
    ativo: true,
  });

  useEffect(() => {
    loadFornecedor();
  }, [id]);

  async function loadFornecedor() {
    try {
      setLoading(true);
      const data = await fornecedoresApi.get(id);
      setForm({
        nome: data.nome || '',
        cnpj_cpf: data.cnpj_cpf || '',
        contato: data.contato || '',
        telefone: data.telefone || '',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        especialidade: data.especialidade || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        uf: data.uf || '',
        cep: data.cep || '',
        observacoes: data.observacoes || '',
        ativo: data.ativo,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar fornecedor');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setError('Nome e obrigatorio'); return; }

    try {
      setSaving(true);
      setError('');
      await fornecedoresApi.update(id, form);
      router.push('/dashboard/compras/fornecedores');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-900">Carregando...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Fornecedor</h1>
        <Link href="/dashboard/compras/fornecedores" className="text-sm text-blue-600 hover:underline">
          &larr; Voltar
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">Nome / Razao Social *</label>
            <input type="text" name="nome" value={form.nome} onChange={handleChange}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">CNPJ/CPF</label>
            <input type="text" name="cnpj_cpf" value={form.cnpj_cpf} onChange={handleChange}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Especialidade</label>
            <input type="text" name="especialidade" value={form.especialidade} onChange={handleChange}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Contato</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Pessoa de Contato</label>
              <input type="text" name="contato" value={form.contato} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">E-mail</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Telefone</label>
              <input type="text" name="telefone" value={form.telefone} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">WhatsApp</label>
              <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Endereco</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Logradouro</label>
              <input type="text" name="logradouro" value={form.logradouro} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Numero</label>
              <input type="text" name="numero" value={form.numero} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">CEP</label>
              <input type="text" name="cep" value={form.cep} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Bairro</label>
              <input type="text" name="bairro" value={form.bairro} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Cidade</label>
              <input type="text" name="cidade" value={form.cidade} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">UF</label>
              <input type="text" name="uf" value={form.uf} onChange={handleChange} maxLength={2}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Complemento</label>
              <input type="text" name="complemento" value={form.complemento} onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Observacoes</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3}
            className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="ativo" checked={form.ativo}
            onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
            className="rounded" />
          <label className="text-sm text-gray-900">Ativo</label>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/compras/fornecedores"
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
