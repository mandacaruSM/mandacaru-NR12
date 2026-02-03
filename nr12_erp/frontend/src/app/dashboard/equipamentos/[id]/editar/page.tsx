// frontend/src/app/dashboard/equipamentos/[id]/editar/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { equipamentosApi, clientesApi, empreendimentosApi, tiposEquipamentoApi, operadoresApi, Equipamento, Cliente, Empreendimento, TipoEquipamento, Operador } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function EditarEquipamentoPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const equipamentoId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [operadorSelecionado, setOperadorSelecionado] = useState<number | ''>('');
  const [formData, setFormData] = useState<Partial<Equipamento>>({});

  useEffect(() => {
    loadInitialData();
  }, [equipamentoId]);

  useEffect(() => {
    if (formData.cliente) {
      loadEmpreendimentos(Number(formData.cliente));
    }
  }, [formData.cliente]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [equipamento, clientesRes, tiposRes, operadoresRes] = await Promise.all([
        equipamentosApi.get(equipamentoId),
        clientesApi.list(),
        tiposEquipamentoApi.list(),
        operadoresApi.list(),
      ]);

      setFormData(equipamento);
      setClientes(clientesRes.results);
      setTipos(tiposRes.results);
      setOperadores(operadoresRes.results);

      if (equipamento.cliente) {
        const empRes = await empreendimentosApi.list({ cliente: equipamento.cliente });
        setEmpreendimentos(empRes.results);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar equipamento');
      toast.error('Erro ao carregar equipamento');
    } finally {
      setLoading(false);
    }
  };

  const loadEmpreendimentos = async (clienteId: number) => {
    try {
      const response = await empreendimentosApi.list({ cliente: clienteId });
      setEmpreendimentos(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar empreendimentos');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              ['cliente', 'empreendimento', 'tipo', 'ano_fabricacao'].includes(name) ?
              (value === '' ? null : Number(value)) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updated = await equipamentosApi.update(equipamentoId, formData);
      if (operadorSelecionado) {
        await operadoresApi.vincularEquipamento(Number(operadorSelecionado), updated.id);
      }
      toast.success('Equipamento atualizado com sucesso!');
      router.push(`/dashboard/equipamentos/${equipamentoId}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar equipamento';
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
          <p className="mt-4 text-gray-900">Carregando equipamento...</p>
        </div>
      </div>
    );
  }

  if (!formData.id) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Equipamento não encontrado</p>
        <Link href="/dashboard/equipamentos" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista de equipamentos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-900 mb-2">
          <Link href="/dashboard/equipamentos" className="hover:text-blue-600">
            Equipamentos
          </Link>
          <span>/</span>
          <Link href={`/dashboard/equipamentos/${equipamentoId}`} className="hover:text-blue-600">
            {formData.codigo}
          </Link>
          <span>/</span>
          <span>Editar</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Equipamento</h1>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Secao: Localizacao */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Localização</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  name="cliente"
                  value={formData.cliente || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome_razao}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empreendimento *</label>
                <select
                  name="empreendimento"
                  value={formData.empreendimento || ''}
                  onChange={handleChange}
                  required
                  disabled={!formData.cliente}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Selecione um empreendimento...</option>
                  {empreendimentos.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Secao: Identificacao */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Identificação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input type="text" name="codigo" value={formData.codigo} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select name="tipo" value={formData.tipo || ''} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500">
                  <option value="">Selecione um tipo...</option>
                  {tipos.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operador opcional</label>
                <select name="operador" value={operadorSelecionado}
                  onChange={(e) => setOperadorSelecionado(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500">
                  <option value="">Não vincular agora</option>
                  {operadores.map(op => (
                    <option key={op.id} value={op.id}>{op.nome_completo} ({op.cpf})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" name="descricao" value={formData.descricao} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Secao: Dados Tecnicos */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Técnicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante</label>
                <input type="text" name="fabricante" value={formData.fabricante} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input type="text" name="modelo" value={formData.modelo} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                <input type="number" name="ano_fabricacao" value={formData.ano_fabricacao || ''} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                <input type="text" name="numero_serie" value={formData.numero_serie} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Secao: Medicao */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Controle de Medição</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Medição *</label>
                <select name="tipo_medicao" value={formData.tipo_medicao} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500">
                  <option value="HORA">Horímetro</option>
                  <option value="KM">Quilômetro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leitura Atual ({formData.tipo_medicao === 'KM' ? 'km' : 'horas'})
                </label>
                <input type="number" name="leitura_atual" value={formData.leitura_atual} onChange={handleChange} step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input type="checkbox" name="ativo" checked={formData.ativo} onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <span className="ml-2 text-sm text-gray-700">Equipamento ativo</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <Link href={`/dashboard/equipamentos/${equipamentoId}`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
