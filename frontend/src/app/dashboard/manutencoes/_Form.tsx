'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Manutencao, Equipamento, Operador } from '@/types/manutencao';

type Props = {
  initial?: Partial<Manutencao>;
  id?: number;
  mode: 'create' | 'edit';
}

interface Cliente {
  id: number;
  nome_razao: string;
}

interface Empreendimento {
  id: number;
  nome: string;
  cliente: number;
}

export default function ManutencaoForm({ initial, id, mode }: Props) {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [tecnicos, setTecnicos] = useState<Operador[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para seleção em cascata
  const [clienteSelecionado, setClienteSelecionado] = useState<number | undefined>(undefined);
  const [empreendimentoSelecionado, setEmpreendimentoSelecionado] = useState<number | undefined>(undefined);

  const [form, setForm] = useState<Partial<Manutencao>>({
    equipamento: initial?.equipamento ?? undefined,
    tipo: (initial?.tipo as any) ?? 'corretiva',
    data: initial?.data ?? new Date().toISOString().slice(0,10),
    horimetro: initial?.horimetro ?? '',
    tecnico: initial?.tecnico ?? undefined,
    descricao: initial?.descricao ?? '',
    observacoes: initial?.observacoes ?? '',
    proxima_manutencao: initial?.proxima_manutencao ?? '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      setLoading(true);
      const [clientsData, tecsData, equipsData] = await Promise.all([
        api<any>('/cadastro/clientes/'),
        api<any>('/tecnicos/'),
        api<any>('/equipamentos/equipamentos/'), // CORRIGIDO: endpoint correto
      ]);

      // Extrair arrays das respostas (podem ser paginadas ou arrays diretos)
      const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.results || []);
      const tecs = Array.isArray(tecsData) ? tecsData : (tecsData?.results || []);
      const equips = Array.isArray(equipsData) ? equipsData : (equipsData?.results || []);

      console.log('📋 Dados carregados:', {
        clientes: clients,
        tecnicos: tecs,
        equipamentos: equips
      });

      setClientes(clients);
      setTecnicos(tecs);
      setEquipamentos(equips);
    } catch (e: any) {
      console.error('Erro ao carregar opções:', e);
      setErro(e.message || 'Erro ao carregar opções');
    } finally {
      setLoading(false);
    }
  }

  // Carregar empreendimentos quando cliente for selecionado
  useEffect(() => {
    if (clienteSelecionado) {
      loadEmpreendimentos(clienteSelecionado);
    } else {
      setEmpreendimentos([]);
      setEmpreendimentoSelecionado(undefined);
    }
  }, [clienteSelecionado]);

  async function loadEmpreendimentos(clienteId: number) {
    try {
      const empsData = await api<any>(`/cadastro/empreendimentos/?cliente=${clienteId}`);
      // Extrair array da resposta (pode ser paginada ou array direto)
      const emps = Array.isArray(empsData) ? empsData : (empsData?.results || []);
      setEmpreendimentos(emps);
    } catch (e: any) {
      console.error('Erro ao carregar empreendimentos:', e);
      setEmpreendimentos([]); // Fallback seguro
    }
  }

  // Filtrar equipamentos por empreendimento
  const equipamentosFiltrados = empreendimentoSelecionado
    ? equipamentos.filter(eq => {
        // Comparação flexível: aceita number ou string
        const eqEmp = eq.empreendimento;
        const eqEmpNum = typeof eqEmp === 'string' ? parseInt(eqEmp) : eqEmp;
        const match = eqEmpNum === empreendimentoSelecionado;

        if (!match) {
          console.log('❌ Equipamento não corresponde:', {
            codigo: eq.codigo,
            empreendimento: eq.empreendimento,
            empreendimentoNum: eqEmpNum,
            buscando: empreendimentoSelecionado,
            tipo: typeof eq.empreendimento
          });
        } else {
          console.log('✅ Equipamento corresponde:', eq.codigo);
        }

        return match;
      })
    : [];

  console.log('📊 Estado atual:', {
    clienteSelecionado,
    empreendimentoSelecionado,
    totalEquipamentos: equipamentos.length,
    equipamentosFiltrados: equipamentosFiltrados.length,
    totalEmpreendimentos: empreendimentos.length,
    equipamentos: equipamentos.map(e => ({ id: e.id, codigo: e.codigo, emp: e.empreendimento }))
  });

  function handleClienteChange(clienteId: number) {
    setClienteSelecionado(clienteId);
    setEmpreendimentoSelecionado(undefined);
    onChange('equipamento', undefined);
  }

  function handleEmpreendimentoChange(empId: number) {
    setEmpreendimentoSelecionado(empId);
    onChange('equipamento', undefined);
  }

  function onChange<K extends keyof Manutencao>(key: K, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSaving(true);
    try {
      const fd = new FormData();
      if (form.equipamento) fd.append('equipamento', String(form.equipamento));
      if (form.tipo) fd.append('tipo', String(form.tipo));
      if (form.data) fd.append('data', String(form.data));
      if (form.horimetro !== undefined) fd.append('horimetro', String(form.horimetro));
      if (form.tecnico) fd.append('tecnico', String(form.tecnico));
      if (form.descricao) fd.append('descricao', String(form.descricao));
      if (form.observacoes) fd.append('observacoes', String(form.observacoes));
      if (form.proxima_manutencao) fd.append('proxima_manutencao', String(form.proxima_manutencao));

      // anexos (opcional)
      const inputAnexos = document.getElementById('anexos') as HTMLInputElement | null;
      if (inputAnexos?.files && inputAnexos.files.length > 0) {
        Array.from(inputAnexos.files).forEach(f => fd.append('anexos_upload', f));
      }

      const API_BASE_V0 = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:8000/api';
      const url = mode === 'create'
        ? `${API_BASE_V0}/manutencoes/`
        : `${API_BASE_V0}/manutencoes/${id}/`;

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        credentials: 'include', // CRÍTICO: Adicionar autenticação
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || res.statusText);
      }

      // CORRIGIDO: Usar router.push ao invés de window.location.href
      router.push('/dashboard/manutencoes');
    } catch (e: any) {
      console.error('Erro ao salvar manutenção:', e);
      setErro(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando formulário...</p>
        </div>
      </div>
    );
  }

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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleção de Equipamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">1. Cliente *</span>
            <select
              value={clienteSelecionado ?? ''}
              onChange={e => handleClienteChange(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none"
              required
            >
              <option value="" className="text-gray-700 bg-white">Selecione um cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id} className="text-black bg-white">{c.nome_razao}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">2. Empreendimento *</span>
            <select
              value={empreendimentoSelecionado ?? ''}
              onChange={e => handleEmpreendimentoChange(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
              disabled={!clienteSelecionado}
              required
            >
              <option value="" className="text-gray-700 bg-white">
                {clienteSelecionado ? 'Selecione um empreendimento...' : 'Primeiro selecione um cliente'}
              </option>
              {empreendimentos.map(emp => (
                <option key={emp.id} value={emp.id} className="text-black bg-white">{emp.nome}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">3. Equipamento *</span>
            <select
              value={form.equipamento ?? ''}
              onChange={e => onChange('equipamento', Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
              disabled={!empreendimentoSelecionado}
              required
            >
              <option value="" className="text-gray-700 bg-white">
                {!empreendimentoSelecionado
                  ? 'Primeiro selecione um empreendimento'
                  : equipamentosFiltrados.length === 0
                  ? 'Nenhum equipamento encontrado neste empreendimento'
                  : 'Selecione um equipamento...'}
              </option>
              {equipamentosFiltrados.map(eq => (
                <option key={eq.id} value={eq.id} className="text-black bg-white">
                  {eq.codigo}{eq.descricao ? ` - ${eq.descricao}` : eq.modelo ? ` - ${eq.modelo}` : ''}
                </option>
              ))}
            </select>
            {empreendimentoSelecionado && equipamentosFiltrados.length === 0 && (
              <span className="text-xs text-amber-600 mt-1">
                ⚠️ Este empreendimento não possui equipamentos cadastrados.
                <a href="/dashboard/equipamentos/novo" className="underline ml-1 hover:text-amber-700">
                  Cadastrar equipamento
                </a>
              </span>
            )}
          </label>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-6">Informações da Manutenção</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Tipo *</span>
            <select
              value={form.tipo ?? 'corretiva'}
              onChange={e => onChange('tipo', e.target.value as any)}
              className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none"
              required
            >
              <option value="corretiva" className="text-black bg-white">Corretiva</option>
              <option value="preventiva" className="text-black bg-white">Preventiva</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Data *</span>
            <input
              type="date"
              value={form.data ?? ''}
              onChange={e => onChange('data', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Horímetro *</span>
            <input
              type="number" step="0.01" min="0"
              value={form.horimetro ?? ''}
              onChange={e => onChange('horimetro', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ex: 1250.5"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Técnico</span>
            <select
              value={form.tecnico ?? ''}
              onChange={e => onChange('tecnico', e.target.value ? Number(e.target.value) : undefined)}
              className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none"
            >
              <option value="" className="text-gray-700 bg-white">Selecione um técnico (opcional)...</option>
              {tecnicos.map(tec => (
                <option key={tec.id} value={tec.id} className="text-black bg-white">{tec.nome}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Próxima Manutenção (Horímetro/KM)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.proxima_manutencao ?? ''}
              onChange={e => onChange('proxima_manutencao', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
              disabled={form.tipo !== 'preventiva'}
              placeholder="Ex: 2500.0"
            />
            {form.tipo !== 'preventiva' ? (
              <span className="text-xs text-gray-500">Disponível apenas para manutenções preventivas</span>
            ) : (
              <span className="text-xs text-gray-600">Informe o horímetro/km para a próxima manutenção preventiva</span>
            )}
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes</h3>
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Descrição</span>
            <textarea
              value={form.descricao ?? ''}
              onChange={e => onChange('descricao', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Descreva os serviços realizados..."
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Observações</span>
            <textarea
              value={form.observacoes ?? ''}
              onChange={e => onChange('observacoes', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Observações adicionais..."
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Anexos</span>
            <input
              id="anexos"
              type="file"
              multiple
              className="border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <span className="text-xs text-gray-500">Você pode anexar múltiplos arquivos</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/dashboard/manutencoes"
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          Voltar
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
        >
          {saving ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvando...
            </span>
          ) : (
            mode === 'create' ? 'Criar Manutenção' : 'Atualizar Manutenção'
          )}
        </button>
      </div>
    </form>
  );
}
