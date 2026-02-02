'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fornecedoresApi } from '@/lib/api';

export default function NovoFornecedorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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
      const payload = { ...form, email: form.email || null };
      await fornecedoresApi.create(payload);
      router.push('/dashboard/compras/fornecedores');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Fornecedor</h1>
        <Link href="/dashboard/compras/fornecedores" className="text-sm text-blue-600 hover:underline">
          &larr; Voltar
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Dados Principais */}
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
              placeholder="Ex: Pecas Hidraulicas, Filtros..."
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
          </div>
        </div>

        {/* Contato */}
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

        {/* Endereco */}
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

        {/* Observacoes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Observacoes</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3}
            className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
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
