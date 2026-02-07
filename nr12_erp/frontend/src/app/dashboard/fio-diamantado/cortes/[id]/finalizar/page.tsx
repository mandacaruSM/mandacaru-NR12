'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fioDiamantadoApi, RegistroCorte } from '@/lib/api';

export default function FinalizarCortePage() {
  const router = useRouter();
  const params = useParams();
  const corteId = params.id as string;

  const [corte, setCorte] = useState<RegistroCorte | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    hora_final: '',
    horimetro_final: '',
    diametro_final_mm: '',
    bloco_comprimento_m: '',
    bloco_altura_m: '',
    litros_diesel: '',
    preco_diesel: '',
    observacoes: '',
  });

  useEffect(() => {
    loadCorte();
  }, [corteId]);

  async function loadCorte() {
    try {
      setLoading(true);
      const data = await fioDiamantadoApi.cortes.get(parseInt(corteId));
      setCorte(data);

      // Pre-preencher com valores atuais se existirem
      if (data.hora_final) {
        setFormData(prev => ({ ...prev, hora_final: data.hora_final || '' }));
      }
      if (data.horimetro_final) {
        setFormData(prev => ({ ...prev, horimetro_final: data.horimetro_final?.toString() || '' }));
      }
      if (data.diametro_final_mm) {
        setFormData(prev => ({ ...prev, diametro_final_mm: data.diametro_final_mm?.toString() || '' }));
      }
      if (data.bloco_comprimento_m) {
        setFormData(prev => ({ ...prev, bloco_comprimento_m: data.bloco_comprimento_m?.toString() || '' }));
      }
      if (data.bloco_altura_m) {
        setFormData(prev => ({ ...prev, bloco_altura_m: data.bloco_altura_m?.toString() || '' }));
      }
      if (data.litros_diesel) {
        setFormData(prev => ({ ...prev, litros_diesel: data.litros_diesel?.toString() || '' }));
      }
      if (data.preco_diesel) {
        setFormData(prev => ({ ...prev, preco_diesel: data.preco_diesel?.toString() || '' }));
      }
      if (data.observacoes) {
        setFormData(prev => ({ ...prev, observacoes: data.observacoes || '' }));
      }

      // Definir hora final atual se não preenchido
      if (!data.hora_final) {
        const now = new Date();
        const horaAtual = now.toTimeString().slice(0, 5);
        setFormData(prev => ({ ...prev, hora_final: horaAtual }));
      }
    } catch (err) {
      console.error('Erro ao carregar corte:', err);
      setError('Erro ao carregar dados do corte');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  // Calcular area estimada
  const areaEstimada = formData.bloco_comprimento_m && formData.bloco_altura_m
    ? parseFloat(formData.bloco_comprimento_m) * parseFloat(formData.bloco_altura_m)
    : 0;

  // Calcular desgaste estimado
  const desgasteEstimado = corte && formData.diametro_final_mm
    ? corte.diametro_inicial_mm - parseFloat(formData.diametro_final_mm)
    : 0;

  // Calcular tempo estimado baseado no horimetro (nao hora do relogio)
  const tempoEstimado = corte && formData.horimetro_final && corte.horimetro_inicial
    ? parseFloat(formData.horimetro_final) - corte.horimetro_inicial
    : 0;

  // Calcular velocidade de corte
  const velocidadeCorte = areaEstimada > 0 && tempoEstimado > 0
    ? areaEstimada / tempoEstimado
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.hora_final) {
      setError('Hora final e obrigatoria');
      return;
    }
    if (!formData.horimetro_final) {
      setError('Horimetro final e obrigatorio');
      return;
    }
    if (!formData.diametro_final_mm) {
      setError('Diametro final e obrigatorio');
      return;
    }
    if (!formData.bloco_comprimento_m || !formData.bloco_altura_m) {
      setError('Medidas do bloco sao obrigatorias');
      return;
    }
    // Validar que horimetro final >= horimetro inicial
    if (corte && parseFloat(formData.horimetro_final) < corte.horimetro_inicial) {
      setError('Horimetro final nao pode ser menor que o horimetro inicial');
      return;
    }

    const diametroFinal = parseFloat(formData.diametro_final_mm);
    if (corte && diametroFinal >= corte.diametro_inicial_mm) {
      setError('Diametro final deve ser menor que o diametro inicial');
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        hora_final: formData.hora_final,
        horimetro_final: parseFloat(formData.horimetro_final),
        diametro_final_mm: parseFloat(formData.diametro_final_mm),
        comprimento_corte_m: parseFloat(formData.bloco_comprimento_m),
        altura_largura_corte_m: parseFloat(formData.bloco_altura_m),
      };

      if (formData.litros_diesel) {
        payload.consumo_combustivel_litros = parseFloat(formData.litros_diesel);
      }
      if (formData.observacoes) {
        payload.observacoes = formData.observacoes;
      }

      await fioDiamantadoApi.cortes.finalizar(parseInt(corteId), payload);
      router.push('/dashboard/fio-diamantado');
    } catch (err: unknown) {
      console.error('Erro ao finalizar corte:', err);
      const errorObj = err as { response?: { data?: Record<string, string[]> } };
      if (errorObj.response?.data) {
        const messages = Object.values(errorObj.response.data).flat();
        setError(messages.join('. '));
      } else {
        setError('Erro ao finalizar corte');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!corte) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Corte nao encontrado
        </div>
        <Link href="/dashboard/fio-diamantado" className="mt-4 inline-block text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  if (corte.status !== 'EM_ANDAMENTO') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Este corte ja foi {corte.status === 'FINALIZADO' ? 'finalizado' : 'cancelado'}
        </div>
        <Link href="/dashboard/fio-diamantado" className="mt-4 inline-block text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finalizar Corte</h1>
          <p className="text-sm text-gray-600 mt-1">
            Registre os dados finais do corte
          </p>
        </div>
        <Link
          href="/dashboard/fio-diamantado"
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancelar
        </Link>
      </div>

      {/* Dados do Corte em Andamento */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
        <h3 className="font-semibold text-orange-800 mb-4">Dados do Corte em Andamento</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Fio</p>
            <p className="font-medium text-gray-900">{corte.fio_codigo}</p>
          </div>
          <div>
            <p className="text-gray-500">Empreendimento</p>
            <p className="font-medium text-gray-900">{corte.empreendimento_nome || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Maquina</p>
            <p className="font-medium text-gray-900">{corte.maquina_codigo || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Operador</p>
            <p className="font-medium text-gray-900">{corte.operador_nome}</p>
          </div>
          <div>
            <p className="text-gray-500">Data</p>
            <p className="font-medium text-gray-900">{new Date(corte.data).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-gray-500">Hora Inicial</p>
            <p className="font-medium text-gray-900">{corte.hora_inicial}</p>
          </div>
          <div>
            <p className="text-gray-500">Horimetro Inicial</p>
            <p className="font-medium text-gray-900">{corte.horimetro_inicial || '-'} h</p>
          </div>
          <div>
            <p className="text-gray-500">Diametro Inicial</p>
            <p className="font-medium text-gray-900">{corte.diametro_inicial_mm} mm</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Dados Finais */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Finais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Hora Final *
                </label>
                <input
                  type="time"
                  name="hora_final"
                  value={formData.hora_final}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Horimetro Final *
                </label>
                <input
                  type="number"
                  name="horimetro_final"
                  value={formData.horimetro_final}
                  onChange={handleChange}
                  step="0.1"
                  min={corte.horimetro_inicial || 0}
                  placeholder={`Min: ${corte.horimetro_inicial || 0}`}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Diametro Final (mm) *
                </label>
                <input
                  type="number"
                  name="diametro_final_mm"
                  value={formData.diametro_final_mm}
                  onChange={handleChange}
                  step="0.01"
                  max={corte.diametro_inicial_mm}
                  required
                  placeholder={`Max: ${corte.diametro_inicial_mm}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Medidas do Bloco */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Medidas do Bloco Cortado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Comprimento (metros) *
                </label>
                <input
                  type="number"
                  name="bloco_comprimento_m"
                  value={formData.bloco_comprimento_m}
                  onChange={handleChange}
                  step="0.01"
                  required
                  placeholder="Ex: 2.50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Altura (metros) *
                </label>
                <input
                  type="number"
                  name="bloco_altura_m"
                  value={formData.bloco_altura_m}
                  onChange={handleChange}
                  step="0.01"
                  required
                  placeholder="Ex: 1.80"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Combustivel (se diesel) */}
          {corte.fonte_energia === 'GERADOR_DIESEL' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Consumo de Combustivel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Litros de Diesel
                  </label>
                  <input
                    type="number"
                    name="litros_diesel"
                    value={formData.litros_diesel}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="Ex: 25.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Preco por Litro (R$)
                  </label>
                  <input
                    type="number"
                    name="preco_diesel"
                    value={formData.preco_diesel}
                    onChange={handleChange}
                    step="0.01"
                    placeholder="Ex: 5.89"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Observacoes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Observacoes
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={3}
              placeholder="Observacoes sobre o corte..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
          </div>

          {/* Preview de Calculos */}
          {(areaEstimada > 0 || desgasteEstimado > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">Calculos Estimados</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">Area do Corte</p>
                  <p className="font-bold text-blue-900">{areaEstimada.toFixed(2)} m2</p>
                </div>
                <div>
                  <p className="text-blue-600">Desgaste do Fio</p>
                  <p className="font-bold text-blue-900">{desgasteEstimado.toFixed(2)} mm</p>
                </div>
                <div>
                  <p className="text-blue-600">Tempo de Corte</p>
                  <p className="font-bold text-blue-900">{tempoEstimado.toFixed(2)} h</p>
                </div>
                <div>
                  <p className="text-blue-600">Velocidade</p>
                  <p className="font-bold text-blue-900">{velocidadeCorte.toFixed(2)} m2/h</p>
                </div>
              </div>
            </div>
          )}

          {/* Botoes */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              href="/dashboard/fio-diamantado"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Finalizando...
                </>
              ) : (
                'Finalizar Corte'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
