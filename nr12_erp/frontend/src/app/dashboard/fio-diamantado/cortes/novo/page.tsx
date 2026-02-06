'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fioDiamantadoApi, equipamentosApi, FioDiamantado, Equipamento } from '@/lib/api';

export default function NovoRegistroCortePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fioIdParam = searchParams.get('fio');

  const [loading, setLoading] = useState(false);
  const [fios, setFios] = useState<FioDiamantado[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [geradores, setGeradores] = useState<Equipamento[]>([]);

  const [formData, setFormData] = useState({
    fio: fioIdParam || '',
    maquina: '',
    gerador: '',
    fonte_energia: 'REDE_ELETRICA',
    data: new Date().toISOString().split('T')[0],
    hora_inicial: '',
    hora_final: '',
    horimetro_inicial: '',
    horimetro_final: '',
    comprimento_corte_m: '',
    altura_largura_corte_m: '',
    diametro_inicial_mm: '',
    diametro_final_mm: '',
    consumo_combustivel_litros: '',
    operador_nome: '',
    observacoes: '',
  });
  const [error, setError] = useState('');

  // Campos calculados
  const [areaCalculada, setAreaCalculada] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Calcular area quando mudar comprimento ou altura
    const comp = parseFloat(formData.comprimento_corte_m);
    const alt = parseFloat(formData.altura_largura_corte_m);
    if (comp > 0 && alt > 0) {
      setAreaCalculada(comp * alt);
    } else {
      setAreaCalculada(null);
    }
  }, [formData.comprimento_corte_m, formData.altura_largura_corte_m]);

  useEffect(() => {
    // Quando selecionar um fio, preencher o diametro inicial com o diametro atual do fio
    if (formData.fio) {
      const fioSelecionado = fios.find(f => f.id === parseInt(formData.fio));
      if (fioSelecionado && fioSelecionado.diametro_atual_mm) {
        setFormData(prev => ({
          ...prev,
          diametro_inicial_mm: fioSelecionado.diametro_atual_mm?.toString() || ''
        }));
      }
    }
  }, [formData.fio, fios]);

  async function loadData() {
    try {
      const [fiosRes, equipRes] = await Promise.all([
        fioDiamantadoApi.fios.list({ status: 'ATIVO' }),
        equipamentosApi.list({ ativo: true }),
      ]);
      setFios(fiosRes.results || []);

      // Separar maquinas e geradores
      const equips = equipRes.results || [];
      setEquipamentos(equips);
      // Filtrar geradores - assumindo que tem "gerador" no tipo ou descricao
      setGeradores(equips.filter(e =>
        e.tipo_nome?.toLowerCase().includes('gerador') ||
        e.descricao?.toLowerCase().includes('gerador')
      ));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validacoes
    if (!formData.fio || !formData.maquina || !formData.data ||
        !formData.hora_inicial || !formData.hora_final ||
        !formData.horimetro_inicial || !formData.horimetro_final ||
        !formData.comprimento_corte_m || !formData.altura_largura_corte_m ||
        !formData.diametro_inicial_mm || !formData.diametro_final_mm) {
      setError('Preencha todos os campos obrigatorios');
      return;
    }

    if (formData.fonte_energia === 'GERADOR_DIESEL' && !formData.gerador) {
      setError('Selecione o gerador quando a fonte for Diesel');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        fio: parseInt(formData.fio),
        maquina: parseInt(formData.maquina),
        fonte_energia: formData.fonte_energia,
        data: formData.data,
        hora_inicial: formData.hora_inicial,
        hora_final: formData.hora_final,
        horimetro_inicial: parseFloat(formData.horimetro_inicial),
        horimetro_final: parseFloat(formData.horimetro_final),
        comprimento_corte_m: parseFloat(formData.comprimento_corte_m),
        altura_largura_corte_m: parseFloat(formData.altura_largura_corte_m),
        diametro_inicial_mm: parseFloat(formData.diametro_inicial_mm),
        diametro_final_mm: parseFloat(formData.diametro_final_mm),
        operador_nome: formData.operador_nome,
        observacoes: formData.observacoes,
      };

      if (formData.gerador) {
        payload.gerador = parseInt(formData.gerador);
      }

      if (formData.consumo_combustivel_litros) {
        payload.consumo_combustivel_litros = parseFloat(formData.consumo_combustivel_litros);
      }

      await fioDiamantadoApi.cortes.create(payload);

      // Redirecionar para o fio ou para a lista
      if (fioIdParam) {
        router.push(`/dashboard/fio-diamantado/${fioIdParam}`);
      } else {
        router.push('/dashboard/fio-diamantado');
      }
    } catch (error: any) {
      console.error('Erro ao criar registro:', error);
      setError(error.message || 'Erro ao registrar corte');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/fio-diamantado" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Corte</h1>
        <p className="text-sm text-gray-500 mt-1">Registre um novo corte de fio diamantado</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione a maquina...</option>
              {equipamentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} - {e.descricao}
                </option>
              ))}
            </select>
          </div>
        </div>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o gerador...</option>
                {geradores.length > 0 ? (
                  geradores.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.codigo} - {g.descricao}
                    </option>
                  ))
                ) : (
                  equipamentos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.codigo} - {e.descricao}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        {/* Data e Horarios */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Data e Horarios</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Data do Corte <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Hora Final <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="hora_final"
                value={formData.hora_final}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Horimetro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Horimetro Final <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="horimetro_final"
              value={formData.horimetro_final}
              onChange={handleChange}
              placeholder="Ex: 1238.50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Medicoes do Corte */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Medicoes do Corte</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Comprimento do Corte (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="comprimento_corte_m"
                value={formData.comprimento_corte_m}
                onChange={handleChange}
                placeholder="Ex: 10.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Altura/Largura do Corte (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="altura_largura_corte_m"
                value={formData.altura_largura_corte_m}
                onChange={handleChange}
                placeholder="Ex: 3.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Area Calculada (m2)
              </label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900">
                {areaCalculada !== null ? areaCalculada.toFixed(2) : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Medicoes das Perolas */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Medicoes das Perolas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Diametro Inicial (mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="diametro_inicial_mm"
                value={formData.diametro_inicial_mm}
                onChange={handleChange}
                placeholder="Ex: 10.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Medicao antes do corte</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Diametro Final (mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="diametro_final_mm"
                value={formData.diametro_final_mm}
                onChange={handleChange}
                placeholder="Ex: 10.30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Medicao apos o corte</p>
            </div>
          </div>
        </div>

        {/* Consumo Combustivel */}
        {formData.fonte_energia === 'GERADOR_DIESEL' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Consumo de Combustivel (litros)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="consumo_combustivel_litros"
              value={formData.consumo_combustivel_litros}
              onChange={handleChange}
              placeholder="Ex: 25.50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Operador e Observacoes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Nome do Operador
            </label>
            <input
              type="text"
              name="operador_nome"
              value={formData.operador_nome}
              onChange={handleChange}
              placeholder="Nome do operador"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Observacoes
            </label>
            <input
              type="text"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Observacoes adicionais"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Salvando...' : 'Registrar Corte'}
          </button>
        </div>
      </form>
    </div>
  );
}
