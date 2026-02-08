'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  fioDiamantadoApi,
  equipamentosApi,
  empreendimentosApi,
  FioDiamantado,
  Equipamento,
  Empreendimento
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function IniciarCortePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isCliente = user?.profile?.role === 'CLIENTE';

  // Pre-populacao via QR Code ou link
  const preEmpreendimento = searchParams.get('empreendimento');
  const preMaquina = searchParams.get('maquina');
  const preFio = searchParams.get('fio');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [fios, setFios] = useState<FioDiamantado[]>([]);
  const [maquinas, setMaquinas] = useState<Equipamento[]>([]);
  const [geradores, setGeradores] = useState<Equipamento[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    empreendimento: preEmpreendimento || '',
    fio: preFio || '',
    maquina: preMaquina || '',
    gerador: '',
    fonte_energia: 'REDE_ELETRICA',
    data: new Date().toISOString().split('T')[0],
    hora_inicial: new Date().toTimeString().slice(0, 5),
    horimetro_inicial: '',
    diametro_inicial_mm: '',
    operador_nome: '',
    observacoes: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.empreendimento) {
      loadEquipamentosByEmpreendimento(parseInt(formData.empreendimento));
    }
  }, [formData.empreendimento]);

  useEffect(() => {
    // Quando seleciona um fio, auto-preenche o diametro inicial
    if (formData.fio) {
      const fioSelecionado = fios.find(f => f.id === parseInt(formData.fio));
      if (fioSelecionado) {
        setFormData(prev => ({
          ...prev,
          diametro_inicial_mm: fioSelecionado.diametro_atual_mm?.toString() || ''
        }));
      }
    }
  }, [formData.fio, fios]);

  useEffect(() => {
    // Quando seleciona uma maquina, auto-preenche o horimetro inicial
    if (formData.maquina) {
      const maquinaSelecionada = maquinas.find(m => m.id === parseInt(formData.maquina));
      if (maquinaSelecionada && maquinaSelecionada.leitura_atual) {
        setFormData(prev => ({
          ...prev,
          horimetro_inicial: maquinaSelecionada.leitura_atual?.toString() || ''
        }));
      }
    }
  }, [formData.maquina, maquinas]);

  async function loadInitialData() {
    try {
      setLoadingData(true);
      const [fiosRes, empsRes] = await Promise.all([
        fioDiamantadoApi.fios.list({ status: 'ATIVO' }),
        empreendimentosApi.list({ page_size: 100 }),
      ]);
      setFios(fiosRes.results || []);
      setEmpreendimentos(empsRes.results || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  }

  async function loadEquipamentosByEmpreendimento(empreendimentoId: number) {
    try {
      const eqRes = await equipamentosApi.list({ empreendimento: empreendimentoId, page_size: 100 });
      const equipamentos = eqRes.results || [];

      // Filtrar maquinas de fio (por tipo ou descricao)
      // Como nao temos um tipo especifico, filtrar por descricao que contenha "fio" ou tipo
      const maquinasFio = equipamentos.filter(e =>
        e.tipo_nome?.toLowerCase().includes('fio') ||
        e.descricao?.toLowerCase().includes('fio') ||
        e.tipo_nome?.toLowerCase().includes('corte')
      );

      // Se nao encontrar maquinas de fio especificas, usar todas
      setMaquinas(maquinasFio.length > 0 ? maquinasFio : equipamentos);

      // Filtrar geradores
      const geradoresFiltrados = equipamentos.filter(e =>
        e.tipo_nome?.toLowerCase().includes('gerador') ||
        e.descricao?.toLowerCase().includes('gerador')
      );
      setGeradores(geradoresFiltrados);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.fio || !formData.maquina || !formData.empreendimento ||
        !formData.data || !formData.hora_inicial || !formData.horimetro_inicial ||
        !formData.diametro_inicial_mm) {
      setError('Preencha todos os campos obrigatorios');
      return;
    }

    if (formData.fonte_energia === 'GERADOR_DIESEL' && !formData.gerador) {
      setError('Selecione o gerador quando usar energia diesel');
      return;
    }

    try {
      setLoading(true);
      await fioDiamantadoApi.cortes.iniciar({
        fio: parseInt(formData.fio),
        maquina: parseInt(formData.maquina),
        gerador: formData.gerador ? parseInt(formData.gerador) : undefined,
        empreendimento: parseInt(formData.empreendimento),
        fonte_energia: formData.fonte_energia,
        data: formData.data,
        hora_inicial: formData.hora_inicial,
        horimetro_inicial: parseFloat(formData.horimetro_inicial),
        diametro_inicial_mm: parseFloat(formData.diametro_inicial_mm),
        operador_nome: formData.operador_nome || undefined,
        observacoes: formData.observacoes || undefined,
      });
      router.push('/dashboard/fio-diamantado');
    } catch (error: any) {
      console.error('Erro ao iniciar corte:', error);
      setError(error.message || 'Erro ao iniciar corte');
    } finally {
      setLoading(false);
    }
  }

  // Buscar fio selecionado para mostrar informacoes
  const fioSelecionado = formData.fio ? fios.find(f => f.id === parseInt(formData.fio)) : null;

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/fio-diamantado" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Iniciar Corte</h1>
        <p className="text-sm text-gray-500 mt-1">Registre o inicio de uma operacao de corte</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Empreendimento */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Empreendimento <span className="text-red-500">*</span>
          </label>
          <select
            name="empreendimento"
            value={formData.empreendimento}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            required
          >
            <option value="">Selecione o empreendimento...</option>
            {empreendimentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} {e.cliente_nome ? `(${e.cliente_nome})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Fio e Maquina */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Fio Diamantado <span className="text-red-500">*</span>
            </label>
            <select
              name="fio"
              value={formData.fio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              required
            >
              <option value="">Selecione o fio...</option>
              {fios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codigo} - {f.fabricante} ({f.diametro_atual_mm}mm)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Maquina de Corte <span className="text-red-500">*</span>
            </label>
            <select
              name="maquina"
              value={formData.maquina}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              required
              disabled={!formData.empreendimento}
            >
              <option value="">
                {formData.empreendimento ? 'Selecione a maquina...' : 'Selecione o empreendimento primeiro'}
              </option>
              {maquinas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} - {m.descricao} (Horim: {m.leitura_atual}h)
                </option>
              ))}
            </select>
            {formData.empreendimento && maquinas.length === 0 && (
              <p className="text-xs text-yellow-600 mt-1">Nenhuma maquina encontrada neste empreendimento</p>
            )}
          </div>
        </div>

        {/* Informacoes do Fio Selecionado */}
        {fioSelecionado && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Informacoes do Fio</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-blue-700">Diametro Atual:</span>
                <span className="font-medium text-blue-900 ml-1">{fioSelecionado.diametro_atual_mm} mm</span>
              </div>
              <div>
                <span className="text-blue-700">Vida Util:</span>
                <span className="font-medium text-blue-900 ml-1">{fioSelecionado.percentual_vida_util}%</span>
              </div>
              <div>
                <span className="text-blue-700">Localizacao:</span>
                <span className="font-medium text-blue-900 ml-1">{fioSelecionado.localizacao_display}</span>
              </div>
              {fioSelecionado.cortes_em_andamento && fioSelecionado.cortes_em_andamento > 0 && (
                <div className="col-span-2 text-yellow-700 font-medium">
                  Atencao: Este fio ja possui {fioSelecionado.cortes_em_andamento} corte(s) em andamento
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fonte de Energia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Fonte de Energia <span className="text-red-500">*</span>
            </label>
            <select
              name="fonte_energia"
              value={formData.fonte_energia}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="REDE_ELETRICA">Rede Eletrica</option>
              <option value="GERADOR_DIESEL">Gerador Diesel</option>
            </select>
          </div>
          {formData.fonte_energia === 'GERADOR_DIESEL' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Gerador <span className="text-red-500">*</span>
              </label>
              <select
                name="gerador"
                value={formData.gerador}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              >
                <option value="">Selecione o gerador...</option>
                {geradores.length > 0 ? (
                  geradores.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.codigo} - {g.descricao}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Nenhum gerador encontrado</option>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Data e Hora Inicial */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Inicio do Corte</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Hora Inicial <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="hora_inicial"
                value={formData.hora_inicial}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Horimetro Inicial <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="horimetro_inicial"
                value={formData.horimetro_inicial}
                onChange={handleChange}
                placeholder="Ex: 1234.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              />
            </div>
          </div>
        </div>

        {/* Medicao das Perolas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Diametro Inicial das Perolas (mm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="diametro_inicial_mm"
              value={formData.diametro_inicial_mm}
              onChange={handleChange}
              placeholder="Ex: 10.50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Medicao antes de iniciar o corte</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Nome do Operador
            </label>
            <input
              type="text"
              name="operador_nome"
              value={formData.operador_nome}
              onChange={handleChange}
              placeholder="Nome do operador responsavel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
          </div>
        </div>

        {/* Observacoes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Observacoes</label>
          <textarea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            rows={2}
            placeholder="Observacoes sobre o inicio do corte..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>

        {/* Botoes */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/fio-diamantado"
            className="px-4 py-2 text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Iniciando...' : 'Iniciar Corte'}
          </button>
        </div>
      </form>
    </div>
  );
}
