'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Tecnico {
  id?: number;
  nome: string;
  nome_completo?: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  foto?: string;
  email?: string;
  telefone?: string;
  telefone_emergencia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  especialidade?: string;
  nivel_experiencia?: string;
  numero_cnh?: string;
  categoria_cnh?: string;
  validade_cnh?: string;
  certificacoes?: string;
  cursos_treinamentos?: string;
  observacoes?: string;
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
    nome_completo: initial?.nome_completo ?? '',
    cpf: initial?.cpf ?? '',
    rg: initial?.rg ?? '',
    data_nascimento: initial?.data_nascimento ?? '',
    email: initial?.email ?? '',
    telefone: initial?.telefone ?? '',
    telefone_emergencia: initial?.telefone_emergencia ?? '',
    logradouro: initial?.logradouro ?? '',
    numero: initial?.numero ?? '',
    complemento: initial?.complemento ?? '',
    bairro: initial?.bairro ?? '',
    cidade: initial?.cidade ?? '',
    uf: initial?.uf ?? '',
    cep: initial?.cep ?? '',
    especialidade: initial?.especialidade ?? '',
    nivel_experiencia: initial?.nivel_experiencia ?? '',
    numero_cnh: initial?.numero_cnh ?? '',
    categoria_cnh: initial?.categoria_cnh ?? '',
    validade_cnh: initial?.validade_cnh ?? '',
    certificacoes: initial?.certificacoes ?? '',
    cursos_treinamentos: initial?.cursos_treinamentos ?? '',
    observacoes: initial?.observacoes ?? '',
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        });
      } else {
        await api(`/tecnicos/${id}/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
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

      {/* Dados Pessoais */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Nome Curto *</span>
            <input
              type="text"
              value={form.nome ?? ''}
              onChange={e => onChange('nome', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nome"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Nome Completo</span>
            <input
              type="text"
              value={form.nome_completo ?? ''}
              onChange={e => onChange('nome_completo', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nome completo"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">CPF</span>
            <input
              type="text"
              value={form.cpf ?? ''}
              onChange={e => onChange('cpf', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="000.000.000-00"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">RG</span>
            <input
              type="text"
              value={form.rg ?? ''}
              onChange={e => onChange('rg', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="00.000.000-0"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Data de Nascimento</span>
            <input
              type="date"
              value={form.data_nascimento ?? ''}
              onChange={e => onChange('data_nascimento', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Contato */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Email</span>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={e => onChange('email', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="email@exemplo.com"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Telefone</span>
            <input
              type="text"
              value={form.telefone ?? ''}
              onChange={e => onChange('telefone', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(00) 00000-0000"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Telefone de Emergência</span>
            <input
              type="text"
              value={form.telefone_emergencia ?? ''}
              onChange={e => onChange('telefone_emergencia', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(00) 00000-0000"
            />
          </label>
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-gray-900">Logradouro</span>
            <input
              type="text"
              value={form.logradouro ?? ''}
              onChange={e => onChange('logradouro', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rua, Avenida, etc."
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Número</span>
            <input
              type="text"
              value={form.numero ?? ''}
              onChange={e => onChange('numero', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Complemento</span>
            <input
              type="text"
              value={form.complemento ?? ''}
              onChange={e => onChange('complemento', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Apto, Bloco, etc."
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Bairro</span>
            <input
              type="text"
              value={form.bairro ?? ''}
              onChange={e => onChange('bairro', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Bairro"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Cidade</span>
            <input
              type="text"
              value={form.cidade ?? ''}
              onChange={e => onChange('cidade', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Cidade"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">UF</span>
            <select
              value={form.uf ?? ''}
              onChange={e => onChange('uf', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione</option>
              <option value="AC">AC</option>
              <option value="AL">AL</option>
              <option value="AP">AP</option>
              <option value="AM">AM</option>
              <option value="BA">BA</option>
              <option value="CE">CE</option>
              <option value="DF">DF</option>
              <option value="ES">ES</option>
              <option value="GO">GO</option>
              <option value="MA">MA</option>
              <option value="MT">MT</option>
              <option value="MS">MS</option>
              <option value="MG">MG</option>
              <option value="PA">PA</option>
              <option value="PB">PB</option>
              <option value="PR">PR</option>
              <option value="PE">PE</option>
              <option value="PI">PI</option>
              <option value="RJ">RJ</option>
              <option value="RN">RN</option>
              <option value="RS">RS</option>
              <option value="RO">RO</option>
              <option value="RR">RR</option>
              <option value="SC">SC</option>
              <option value="SP">SP</option>
              <option value="SE">SE</option>
              <option value="TO">TO</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">CEP</span>
            <input
              type="text"
              value={form.cep ?? ''}
              onChange={e => onChange('cep', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="00000-000"
            />
          </label>
        </div>
      </div>

      {/* Qualificações */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualificações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Especialidade</span>
            <input
              type="text"
              value={form.especialidade ?? ''}
              onChange={e => onChange('especialidade', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Hidráulica, Elétrica, etc."
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Nível de Experiência</span>
            <select
              value={form.nivel_experiencia ?? ''}
              onChange={e => onChange('nivel_experiencia', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione</option>
              <option value="junior">Júnior</option>
              <option value="pleno">Pleno</option>
              <option value="senior">Sênior</option>
            </select>
          </label>
        </div>
      </div>

      {/* CNH */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CNH</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Número da CNH</span>
            <input
              type="text"
              value={form.numero_cnh ?? ''}
              onChange={e => onChange('numero_cnh', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="00000000000"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Categoria</span>
            <select
              value={form.categoria_cnh ?? ''}
              onChange={e => onChange('categoria_cnh', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Validade</span>
            <input
              type="date"
              value={form.validade_cnh ?? ''}
              onChange={e => onChange('validade_cnh', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Certificações e Cursos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificações e Cursos</h3>
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Certificações</span>
            <textarea
              value={form.certificacoes ?? ''}
              onChange={e => onChange('certificacoes', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Liste as certificações do técnico"
              rows={3}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Cursos e Treinamentos</span>
            <textarea
              value={form.cursos_treinamentos ?? ''}
              onChange={e => onChange('cursos_treinamentos', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Liste os cursos e treinamentos realizados"
              rows={3}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Observações</span>
            <textarea
              value={form.observacoes ?? ''}
              onChange={e => onChange('observacoes', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Observações adicionais"
              rows={3}
            />
          </label>

          <label className="flex items-center gap-3">
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
