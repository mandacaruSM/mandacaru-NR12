'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  abastecimentosApi,
  operadoresApi,
  almoxarifadoApi,
  type Abastecimento,
  type Operador,
  type Produto,
  type LocalEstoque,
} from '@/lib/api';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Props = {
  initial?: Partial<Abastecimento>;
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

interface Equipamento {
  id: number;
  codigo: string;
  descricao?: string;
  modelo?: string;
  empreendimento: number;
  leitura_atual: string;
  tipo_medicao: 'KM' | 'HORA';
}

export default function AbastecimentoForm({ initial, id, mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [locais, setLocais] = useState<LocalEstoque[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefilledFromUrl, setPrefilledFromUrl] = useState(false);

  // Estados para seleção em cascata
  const [clienteSelecionado, setClienteSelecionado] = useState<number | undefined>(undefined);
  const [empreendimentoSelecionado, setEmpreendimentoSelecionado] = useState<number | undefined>(undefined);

  const [form, setForm] = useState<any>({
    equipamento: initial?.equipamento ?? undefined,
    data: initial?.data ?? new Date().toISOString().slice(0, 10),
    horimetro_km: initial?.horimetro_km ?? '',
    tipo_combustivel: initial?.tipo_combustivel ?? 'DIESEL',
    quantidade_litros: initial?.quantidade_litros ?? '',
    valor_total: initial?.valor_total ?? '',
    local: initial?.local ?? '',
    local_estoque: initial?.local_estoque ?? undefined,
    produto: initial?.produto ?? undefined,
    operador: initial?.operador ?? undefined,
    observacoes: initial?.observacoes ?? '',
    numero_nota: initial?.numero_nota ?? '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  // Pre-preencher do URL quando os dados forem carregados
  useEffect(() => {
    if (!loading && equipamentos.length > 0 && !prefilledFromUrl) {
      const equipamentoParam = searchParams.get('equipamento');
      const leituraParam = searchParams.get('leitura');

      if (equipamentoParam) {
        const equipamentoId = Number(equipamentoParam);
        const equipamento = equipamentos.find(eq => eq.id === equipamentoId);

        if (equipamento) {
          console.log('🔄 Pre-preenchendo formulário com equipamento:', equipamento);

          // Encontrar cliente e empreendimento do equipamento
          const empreendimentoId = typeof equipamento.empreendimento === 'string'
            ? parseInt(equipamento.empreendimento)
            : equipamento.empreendimento;

          // Carregar empreendimentos para encontrar o cliente
          api<any>(`/cadastro/empreendimentos/${empreendimentoId}/`).then(emp => {
            const clienteId = emp.cliente;

            // Setar cliente
            setClienteSelecionado(clienteId);

            // Carregar empreendimentos do cliente
            api<any>(`/cadastro/empreendimentos/?cliente=${clienteId}`).then(empsData => {
              const emps = Array.isArray(empsData) ? empsData : (empsData?.results || []);
              setEmpreendimentos(emps);

              // Setar empreendimento
              setEmpreendimentoSelecionado(empreendimentoId);

              // Setar equipamento e leitura
              setForm((prev: any) => ({
                ...prev,
                equipamento: equipamentoId,
                horimetro_km: leituraParam || equipamento.leitura_atual || '',
              }));

              setPrefilledFromUrl(true);
            }).catch(console.error);
          }).catch(console.error);
        }
      }
    }
  }, [loading, equipamentos, searchParams, prefilledFromUrl]);

  async function loadOptions() {
    try {
      setLoading(true);

      // Carregar dados essenciais
      const [clientsData, equipsData] = await Promise.all([
        api<any>('/cadastro/clientes/'),
        api<any>('/equipamentos/equipamentos/'),
      ]);

      // Extrair arrays das respostas
      const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.results || []);
      const equips = Array.isArray(equipsData) ? equipsData : (equipsData?.results || []);

      setClientes(clients);
      setEquipamentos(equips);

      // Tentar carregar operadores (opcional)
      try {
        const operadoresData = await operadoresApi.list();
        setOperadores(operadoresData.results || []);
        console.log('✅ Operadores carregados:', operadoresData.results);
      } catch (opErr: any) {
        console.warn('⚠️ Operadores não disponíveis:', opErr.message);
        setOperadores([]);
      }

      // Tentar carregar dados do almoxarifado (opcional)
      try {
        const [produtosData, locaisData] = await Promise.all([
          almoxarifadoApi.produtos.combustiveis(),
          almoxarifadoApi.locais.list(),
        ]);
        setProdutos(produtosData || []);
        setLocais(locaisData.results || []);
        console.log('✅ Almoxarifado carregado:', { produtos: produtosData, locais: locaisData.results });
      } catch (almoxErr: any) {
        console.warn('⚠️ Almoxarifado não disponível, campos de estoque serão ocultados:', almoxErr.message);
        setProdutos([]);
        setLocais([]);
      }

      console.log('📋 Dados carregados:', {
        clientes: clients,
        equipamentos: equips
      });
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
      loadOperadoresPorCliente(clienteSelecionado);
    } else {
      setEmpreendimentos([]);
      setEmpreendimentoSelecionado(undefined);
      // Recarregar todos os operadores se não houver cliente selecionado
      loadOperadores();
    }
  }, [clienteSelecionado]);

  // Operadores já são carregados por cliente quando clienteSelecionado muda
  // Não é necessário recarregar quando empreendimento muda, pois operadores pertencem ao cliente, não ao empreendimento

  async function loadEmpreendimentos(clienteId: number) {
    try {
      const empsData = await api<any>(`/cadastro/empreendimentos/?cliente=${clienteId}`);
      const emps = Array.isArray(empsData) ? empsData : (empsData?.results || []);
      setEmpreendimentos(emps);
    } catch (e: any) {
      console.error('Erro ao carregar empreendimentos:', e);
      setEmpreendimentos([]);
    }
  }

  async function loadOperadores() {
    try {
      const operadoresData = await operadoresApi.list();
      setOperadores(operadoresData.results || []);
    } catch (error) {
      console.warn('⚠️ Operadores não disponíveis:', error);
      setOperadores([]);
    }
  }

  async function loadOperadoresPorCliente(clienteId: number) {
    try {
      const operadoresData = await operadoresApi.list({ cliente: clienteId });
      setOperadores(operadoresData.results || []);
    } catch (error) {
      console.warn('⚠️ Erro ao carregar operadores por cliente:', error);
      setOperadores([]);
    }
  }

  // Operadores são filtrados por cliente, não por empreendimento
  // A função loadOperadoresPorCliente já faz isso

  // Filtrar equipamentos por empreendimento
  const equipamentosFiltrados = empreendimentoSelecionado
    ? equipamentos.filter(eq => {
        const eqEmp = eq.empreendimento;
        const eqEmpNum = typeof eqEmp === 'string' ? parseInt(eqEmp) : eqEmp;
        return eqEmpNum === empreendimentoSelecionado;
      })
    : [];

  function handleClienteChange(clienteId: number) {
    setClienteSelecionado(clienteId);
    setEmpreendimentoSelecionado(undefined);
    onChange('equipamento', undefined);
  }

  function handleEmpreendimentoChange(empId: number) {
    setEmpreendimentoSelecionado(empId);
    onChange('equipamento', undefined);
  }

  function onChange(key: string, value: any) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  const calcularValorUnitario = () => {
    const quantidade = parseFloat(form.quantidade_litros);
    const total = parseFloat(form.valor_total);
    if (quantidade > 0 && total > 0) {
      return (total / quantidade).toFixed(3);
    }
    return '';
  };

  // Obter equipamento selecionado para mostrar leitura atual
  const equipamentoSelecionado = equipamentos.find(eq => eq.id === form.equipamento);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSaving(true);

    try {
      const payload = {
        equipamento: Number(form.equipamento),
        data: form.data,
        horimetro_km: form.horimetro_km,
        tipo_combustivel: form.tipo_combustivel,
        quantidade_litros: form.quantidade_litros,
        valor_total: form.valor_total,
        local: form.local || '',
        local_estoque: form.local_estoque ? Number(form.local_estoque) : null,
        produto: form.produto ? Number(form.produto) : null,
        operador: form.operador ? Number(form.operador) : null,
        observacoes: form.observacoes || '',
        numero_nota: form.numero_nota || '',
      };

      if (mode === 'create') {
        await abastecimentosApi.create(payload);
        toast.success('Abastecimento criado com sucesso');
      } else {
        await abastecimentosApi.update(id!, payload);
        toast.success('Abastecimento atualizado com sucesso');
      }

      // Força reload completo da página para garantir que a listagem seja atualizada
      window.location.href = '/dashboard/abastecimentos';
    } catch (e: any) {
      console.error('Erro ao salvar abastecimento:', e);
      const errorMsg = e.message || 'Erro ao salvar';
      setErro(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando formulário...</p>
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

      {/* Seleção de Equipamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleção de Equipamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {' '} (Atual: {parseFloat(eq.leitura_atual).toFixed(2)} {eq.tipo_medicao})
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

        {equipamentoSelecionado && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-900">
              <span className="font-semibold">Leitura atual do equipamento:</span>{' '}
              {parseFloat(equipamentoSelecionado.leitura_atual).toFixed(2)} {equipamentoSelecionado.tipo_medicao}
            </p>
          </div>
        )}
      </div>

      {/* Informações do Abastecimento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Abastecimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Data *</span>
            <input
              type="date"
              value={form.data ?? ''}
              onChange={e => onChange('data', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 !text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Horímetro / KM *</span>
            <input
              type="number"
              step="0.01"
              min={equipamentoSelecionado ? parseFloat(equipamentoSelecionado.leitura_atual) : 0}
              value={form.horimetro_km ?? ''}
              onChange={e => onChange('horimetro_km', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 !text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ex: 1250.50"
              required
            />
            {equipamentoSelecionado ? (
              <span className="text-xs text-gray-900">
                Valor mínimo: {parseFloat(equipamentoSelecionado.leitura_atual).toFixed(2)} {equipamentoSelecionado.tipo_medicao} (leitura atual)
              </span>
            ) : (
              <span className="text-xs text-gray-900">
                Informe a leitura do horímetro/odômetro no momento do abastecimento
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Tipo de Combustível *</span>
            <select
              value={form.tipo_combustivel ?? 'DIESEL'}
              onChange={e => onChange('tipo_combustivel', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none"
              required
            >
              <option value="DIESEL" className="text-black bg-white">Diesel</option>
              <option value="GASOLINA" className="text-black bg-white">Gasolina</option>
              <option value="ETANOL" className="text-black bg-white">Etanol</option>
              <option value="GNV" className="text-black bg-white">GNV</option>
              <option value="OUTRO" className="text-black bg-white">Outro</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Operador</span>
            <select
              value={form.operador ?? ''}
              onChange={e => onChange('operador', e.target.value ? Number(e.target.value) : undefined)}
              className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none"
            >
              <option value="" className="text-gray-700 bg-white">Selecione um operador (opcional)...</option>
              {operadores.map(op => (
                <option key={op.id} value={op.id} className="text-black bg-white">{op.nome_completo}</option>
              ))}
            </select>
            {empreendimentoSelecionado && (
              <span className="text-xs text-gray-900">
                Mostrando operadores vinculados ao empreendimento selecionado
              </span>
            )}
            {clienteSelecionado && !empreendimentoSelecionado && (
              <span className="text-xs text-gray-900">
                Mostrando operadores vinculados ao cliente selecionado
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Valores */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Valores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Quantidade (Litros) *</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.quantidade_litros ?? ''}
              onChange={e => onChange('quantidade_litros', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 !text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="0.00"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Valor Total (R$) *</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_total ?? ''}
              onChange={e => onChange('valor_total', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 !text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="0.00"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Valor Unitário (R$/L)</span>
            <input
              type="text"
              value={calcularValorUnitario()}
              disabled
              className="border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 cursor-not-allowed"
            />
            <span className="text-xs text-gray-900">Calculado automaticamente</span>
          </label>
        </div>
      </div>

      {/* Controle de Estoque - só mostra se houver produtos ou locais */}
      {(produtos.length > 0 || locais.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Controle de Estoque (Opcional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {produtos.length > 0 && (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-900">Produto de Combustível</span>
                <select
                  value={form.produto ?? ''}
                  onChange={e => onChange('produto', e.target.value ? Number(e.target.value) : undefined)}
                  className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none"
                >
                  <option value="" className="text-gray-700 bg-white">Selecione um produto...</option>
                  {produtos.map(prod => (
                    <option key={prod.id} value={prod.id} className="text-black bg-white">
                      {prod.codigo} - {prod.nome}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-900">
                  Vincule a um produto do estoque para controle automático
                </span>
              </label>
            )}

            {locais.length > 0 && (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-900">Local de Estoque</span>
                <select
                  value={form.local_estoque ?? ''}
                  onChange={e => onChange('local_estoque', e.target.value ? Number(e.target.value) : undefined)}
                  className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black bg-white placeholder-gray-500 appearance-none"
                >
                  <option value="" className="text-gray-700 bg-white">Selecione um local...</option>
                  {locais.map(local => (
                    <option key={local.id} value={local.id} className="text-black bg-white">
                      {local.nome} ({local.tipo_display})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-900">
                  Local de onde saiu o combustível (Tanque/Posto)
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Informações Adicionais */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-900">Local (Descrição)</span>
              <input
                type="text"
                value={form.local ?? ''}
                onChange={e => onChange('local', e.target.value)}
                className="border border-gray-300 rounded-lg p-2.5 !text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Ex: Posto Shell - BR 101"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-900">Número da Nota Fiscal</span>
              <input
                type="text"
                value={form.numero_nota ?? ''}
                onChange={e => onChange('numero_nota', e.target.value)}
                className="border border-gray-300 rounded-lg p-2.5 !text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Ex: 12345"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">Observações</span>
            <textarea
              value={form.observacoes ?? ''}
              onChange={e => onChange('observacoes', e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 !text-gray-900 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Observações adicionais..."
            />
          </label>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <Link
          href="/dashboard/abastecimentos"
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
            mode === 'create' ? 'Criar Abastecimento' : 'Atualizar Abastecimento'
          )}
        </button>
      </div>
    </form>
  );
}
