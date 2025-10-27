// frontend/src/app/dashboard/empreendimentos/novo/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { empreendimentosApi, clientesApi, equipamentosApi, supervisoresApi, Empreendimento, Cliente, Equipamento, Supervisor } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const TIPO_OPTIONS = [
  { value: 'LAVRA', label: 'Lavra' },
  { value: 'OBRA', label: 'Obra' },
  { value: 'PLANTA', label: 'Planta' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function NovoEmpreendimentoPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [error, setError] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<number[]>([]);
  const [supervisorSelecionado, setSupervisorSelecionado] = useState<number | ''>('');

  const [formData, setFormData] = useState<Partial<Empreendimento>>({
    cliente: undefined,
    nome: '',
    tipo: 'LAVRA',
    distancia_km: '0',
    latitude: null,
    longitude: null,
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    ativo: true,
  });

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    // quando cliente mudar, carregar equipamentos e supervisores do cliente (se aplicável)
    if (formData.cliente) {
      loadEquipamentos(Number(formData.cliente));
      loadSupervisores();
    } else {
      setEquipamentos([]);
      setEquipamentosSelecionados([]);
      setSupervisores([]);
      setSupervisorSelecionado('');
    }
  }, [formData.cliente]);

  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
      const response = await clientesApi.list();
      setClientes(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadEquipamentos = async (clienteId: number) => {
    try {
      const res = await equipamentosApi.list({ cliente: clienteId });
      setEquipamentos(res.results);
    } catch (e) {
      toast.error('Erro ao carregar equipamentos do cliente');
    }
  };

  const loadSupervisores = async () => {
    try {
      const res = await supervisoresApi.list();
      setSupervisores(res.results);
    } catch (e) {
      // opcional
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'cliente' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente) {
      toast.error('Selecione um cliente');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        supervisor: supervisorSelecionado || null,
      } as any;
      const created = await empreendimentosApi.create(payload);
      // Atribuir equipamentos selecionados ao empreendimento criado
      if (equipamentosSelecionados.length > 0) {
        await Promise.all(
          equipamentosSelecionados.map(id => equipamentosApi.update(id, { empreendimento: created.id }))
        );
      }
      toast.success('Empreendimento cadastrado com sucesso!');
      router.push('/dashboard/empreendimentos');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao cadastrar empreendimento';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingClientes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/empreendimentos" className="hover:text-blue-600">
            Empreendimentos
          </Link>
          <span>/</span>
          <span>Novo Empreendimento</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Empreendimento</h1>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        {/* Erro */}
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
              {/* Cliente */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  name="cliente"
                  value={formData.cliente || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome_razao}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Empreendimento *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="Ex: Shopping Center Salvador"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  {TIPO_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Distância */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distância (km)
                </label>
                <input
                  type="number"
                  name="distancia_km"
                  value={formData.distancia_km}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Seção: Responsável e Equipamentos */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vínculos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supervisor (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor (opcional) 🧑‍💼</label>
                <select
                  value={supervisorSelecionado}
                  onChange={(e) => setSupervisorSelecionado(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  <option value="">Não definir agora</option>
                  {supervisores.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.nome_completo} ({sp.cpf})</option>
                  ))}
                </select>
              </div>

              {/* Equipamentos do cliente para vincular ao empreendimento */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipamentos do cliente</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto border rounded-lg p-3">
                  {equipamentos.map(eq => (
                    <label key={eq.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={equipamentosSelecionados.includes(eq.id)}
                        onChange={(e) => {
                          setEquipamentosSelecionados(prev => e.target.checked ? [...prev, eq.id] : prev.filter(i => i !== eq.id));
                        }}
                      />
                      <span className="text-gray-700">{eq.codigo} — {eq.descricao || 'Sem descrição'}</span>
                    </label>
                  ))}
                  {equipamentos.length === 0 && (
                    <div className="text-gray-500">Nenhum equipamento deste cliente.</div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Os equipamentos selecionados serão vinculados a este empreendimento.</p>
              </div>
            </div>
          </div>

          {/* Seção: Localização */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                <input type="text" name="logradouro" value={formData.logradouro || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="text" name="numero" value={formData.numero || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input type="text" name="complemento" value={formData.complemento || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" name="bairro" value={formData.bairro || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" name="cidade" value={formData.cidade || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                <input type="text" name="uf" value={formData.uf || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input type="text" name="cep" value={formData.cep || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
            </div>
          </div>

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
              <span className="ml-2 text-sm text-gray-700">Empreendimento ativo</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <Link
            href="/dashboard/empreendimentos"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Empreendimento'}
          </button>
        </div>
      </form>
    </div>
  );
}
