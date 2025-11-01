'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Tecnico {
  id?: number;
  nome: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
}

type Props = {
  initial?: Partial<Tecnico>;
  id?: number;
  mode: 'create' | 'edit';
}

export default function TecnicoForm({ initial, id, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Tecnico>>({
    nome: initial?.nome ?? '',
    email: initial?.email ?? '',
    telefone: initial?.telefone ?? '',
    ativo: initial?.ativo ?? true,
  });

  const onChange = (field: keyof Tecnico, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome) {
      setErro('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);
      setErro(null);

      if (mode === 'create') {
        await api('/tecnicos/', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      } else {
        await api(`/tecnicos/${id}/`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      }

      router.push('/dashboard/tecnicos');
    } catch (e: any) {
      console.error('Erro ao salvar:', e);
      setErro(e.message || 'Erro ao salvar técnico');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {erro && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">{erro}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Técnico</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-gray-900">Nome *</span>
            <input
              type="text"
              value={form.nome ?? ''}
              onChange={e => onChange('nome', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Nome completo do técnico"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Email</span>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={e => onChange('email', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="email@exemplo.com"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Telefone</span>
            <input
              type="text"
              value={form.telefone ?? ''}
              onChange={e => onChange('telefone', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="(00) 00000-0000"
            />
          </label>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.ativo ?? true}
              onChange={e => onChange('ativo', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-gray-900">Técnico ativo</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? 'Salvando...' : mode === 'create' ? 'Cadastrar' : 'Salvar Alterações'}
        </button>
        <Link
          href="/dashboard/tecnicos"
          className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
