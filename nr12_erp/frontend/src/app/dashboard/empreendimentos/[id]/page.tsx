// frontend/src/app/dashboard/empreendimentos/[id]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { empreendimentosApi, clientesApi, equipamentosApi, supervisoresApi, api, Empreendimento, Cliente, Equipamento, Supervisor, GeocodificacaoResult } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import GeoCapture from '@/components/GeoCapture';

const TIPO_OPTIONS = [
  { value: 'LAVRA', label: 'Lavra' },
  { value: 'OBRA', label: 'Obra' },
  { value: 'PLANTA', label: 'Planta' },
  { value: 'OUTRO', label: 'Outro' },
];

interface Tecnico {
  id: number;
  nome: string;
  nome_completo?: string;
}

export default function EditarEmpreendimentoPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const empreendimentoId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<number[]>([]);
  const [supervisorSelecionado, setSupervisorSelecionado] = useState<number | ''>('');
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState<number[]>([]);
  const [formData, setFormData] = useState<Partial<Empreendimento>>({});

  useEffect(() => {
    loadClientes();
    loadEmpreendimento();
  }, [empreendimentoId]);

  useEffect(() => {
    if (formData?.cliente) {
      loadEquipamentos(Number(formData.cliente));
      loadSupervisores();
      loadTecnicos();
    }
  }, [formData?.cliente]);

  const loadClientes = async () => {
    try {
      const response = await clientesApi.list();
      setClientes(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const loadEmpreendimento = async () => {
    try {
      setLoading(true);
      const empreendimento = await empreendimentosApi.get(empreendimentoId);
      setFormData(empreendimento);
      setSupervisorSelecionado((empreendimento as any).supervisor ?? '');

      // Carregar técnicos vinculados
      if ((empreendimento as any).tecnicos_vinculados_ids) {
        setTecnicosSelecionados((empreendimento as any).tecnicos_vinculados_ids);
      }

      // equipamentos do cliente para oferecer seleção
      if (empreendimento.cliente) {
        const resEq = await equipamentosApi.list({ cliente: Number(empreendimento.cliente) });
        setEquipamentos(resEq.results);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar empreendimento');
      toast.error('Erro ao carregar empreendimento');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipamentos = async (clienteId: number) => {
    try {
      const res = await equipamentosApi.list({ cliente: clienteId });
      setEquipamentos(res.results);
    } catch (e) {
      toast.error('Erro ao carregar equipamentos');
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

  const loadTecnicos = async () => {
    try {
      const res = await api<any>('/tecnicos/');
      setTecnicos(res.results || res || []);
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
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        supervisor: supervisorSelecionado === '' ? null : supervisorSelecionado,
        tecnicos_ids: tecnicosSelecionados,
      } as any;
      await empreendimentosApi.update(empreendimentoId, payload);
      if (equipamentosSelecionados.length > 0) {
        await Promise.all(
          equipamentosSelecionados.map(id => equipamentosApi.update(id, { empreendimento: empreendimentoId }))
        );
      }
      toast.success('Empreendimento atualizado com sucesso!');
      router.push('/dashboard/empreendimentos');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar empreendimento';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando empreendimento...</p>
        </div>
      </div>
    );
  }

  if (!formData.id) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Empreendimento não encontrado</p>
        <Link href="/dashboard/empreendimentos" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista de empreendimentos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-900 mb-2">
          <Link href="/dashboard/empreendimentos" className="hover:text-blue-600">
            Empreendimentos
          </Link>
          <span>/</span>
          <span>{formData.nome}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Empreendimento</h1>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
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
                />
              </div>
            </div>
          </div>

          {/* Seção: Geolocalização */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Geolocalização</h2>
            <div className="space-y-4">
              <GeoCapture
                initialLatitude={formData.latitude}
                initialLongitude={formData.longitude}
                onCapture={(data) => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: data.latitude.toString(),
                    longitude: data.longitude.toString(),
                    // Se tiver endereço geocodificado, preenche os campos
                    ...(data.endereco ? {
                      endereco_geocodificado: data.endereco.endereco_completo,
                      logradouro: data.endereco.logradouro || prev.logradouro,
                      bairro: data.endereco.bairro || prev.bairro,
                      cidade: data.endereco.cidade || prev.cidade,
                      uf: data.endereco.uf || prev.uf,
                      cep: data.endereco.cep || prev.cep,
                    } : {})
                  }));
                  toast.success('Localização capturada com sucesso!');
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    name="latitude"
                    value={formData.latitude || ''}
                    onChange={handleChange}
                    placeholder="-23.5505199"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    name="longitude"
                    value={formData.longitude || ''}
                    onChange={handleChange}
                    placeholder="-46.6333094"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raio Geofence (metros)</label>
                  <input
                    type="number"
                    name="raio_geofence"
                    value={formData.raio_geofence || 500}
                    onChange={handleChange}
                    min="50"
                    max="10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Área válida para checklists NR12</p>
                </div>
              </div>

              {formData.link_google_maps && (
                <a
                  href={formData.link_google_maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Ver no Google Maps
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Seção: Endereço */}
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

          {/* Vínculos */}
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
                  <option value="">Não alterar</option>
                  {supervisores.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.nome_completo} ({sp.cpf})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Associação de supervisor por cliente; alteração específica por empreendimento requer backend.</p>
              </div>

              {/* Técnicos (múltiplos) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnicos Autorizados 🔧</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto border rounded-lg p-3">
                  {tecnicos.map(tec => (
                    <label key={tec.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={tecnicosSelecionados.includes(tec.id)}
                        onChange={(e) => {
                          setTecnicosSelecionados(prev => e.target.checked ? [...prev, tec.id] : prev.filter(i => i !== tec.id));
                        }}
                      />
                      <span className="text-gray-700">{tec.nome_completo || tec.nome}</span>
                    </label>
                  ))}
                  {tecnicos.length === 0 && (
                    <div className="text-gray-500">Nenhum técnico cadastrado.</div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Técnicos selecionados terão acesso aos equipamentos deste empreendimento.</p>
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
                    <div className="text-gray-500">Nenhum equipamento para este cliente.</div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Selecionados serão vinculados a este empreendimento.</p>
              </div>
            </div>
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
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
