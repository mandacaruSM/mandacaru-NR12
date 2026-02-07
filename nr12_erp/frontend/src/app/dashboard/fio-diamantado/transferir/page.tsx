'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fioDiamantadoApi, empreendimentosApi, FioDiamantado, Empreendimento } from '@/lib/api';

type LocalizacaoDestino = 'ALMOXARIFADO' | 'EMPREENDIMENTO';

export default function TransferirFioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fioIdParam = searchParams.get('fio');

  const [fios, setFios] = useState<FioDiamantado[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    fio: fioIdParam || '',
    localizacao_destino: '' as LocalizacaoDestino | '',
    empreendimento_destino: '',
    observacoes: '',
  });

  const [fioSelecionado, setFioSelecionado] = useState<FioDiamantado | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.fio) {
      const fio = fios.find(f => f.id === parseInt(formData.fio));
      setFioSelecionado(fio || null);
    } else {
      setFioSelecionado(null);
    }
  }, [formData.fio, fios]);

  async function loadData() {
    try {
      setLoading(true);
      const [fiosRes, empreendimentosRes] = await Promise.all([
        fioDiamantadoApi.fios.list({ status: 'ATIVO' }),
        empreendimentosApi.list({ ativo: true }),
      ]);
      setFios(fiosRes.results || []);
      setEmpreendimentos(empreendimentosRes.results || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpar empreendimento se mudar para almoxarifado
    if (name === 'localizacao_destino' && value === 'ALMOXARIFADO') {
      setFormData(prev => ({ ...prev, [name]: value, empreendimento_destino: '' }));
    }
  }

  function getLocalizacaoAtual(fio: FioDiamantado): string {
    if (fio.localizacao === 'ALMOXARIFADO') {
      return 'Almoxarifado';
    }
    if (fio.localizacao === 'EMPREENDIMENTO' && fio.empreendimento_nome) {
      return `Empreendimento: ${fio.empreendimento_nome}`;
    }
    if (fio.localizacao === 'MAQUINA' && fio.maquina_instalada_codigo) {
      return `Instalado em: ${fio.maquina_instalada_codigo}`;
    }
    return fio.localizacao || 'Nao definido';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.fio) {
      setError('Selecione um fio');
      return;
    }
    if (!formData.localizacao_destino) {
      setError('Selecione o destino');
      return;
    }
    if (formData.localizacao_destino === 'EMPREENDIMENTO' && !formData.empreendimento_destino) {
      setError('Selecione o empreendimento de destino');
      return;
    }

    // Validar se o destino e diferente do atual
    if (fioSelecionado) {
      if (formData.localizacao_destino === 'ALMOXARIFADO' && fioSelecionado.localizacao === 'ALMOXARIFADO') {
        setError('O fio ja esta no Almoxarifado');
        return;
      }
      if (formData.localizacao_destino === 'EMPREENDIMENTO' &&
          fioSelecionado.localizacao === 'EMPREENDIMENTO' &&
          fioSelecionado.empreendimento?.toString() === formData.empreendimento_destino) {
        setError('O fio ja esta neste empreendimento');
        return;
      }
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        localizacao_destino: formData.localizacao_destino,
      };

      if (formData.localizacao_destino === 'EMPREENDIMENTO') {
        payload.empreendimento_destino = parseInt(formData.empreendimento_destino);
      }
      if (formData.observacoes) {
        payload.observacoes = formData.observacoes;
      }

      await fioDiamantadoApi.fios.transferir(parseInt(formData.fio), payload);

      setSuccess('Transferencia realizada com sucesso!');

      // Recarregar dados
      await loadData();

      // Limpar formulario
      setFormData({
        fio: '',
        localizacao_destino: '',
        empreendimento_destino: '',
        observacoes: '',
      });

      // Redirecionar apos 2 segundos
      setTimeout(() => {
        router.push('/dashboard/fio-diamantado');
      }, 2000);

    } catch (err: unknown) {
      console.error('Erro ao transferir fio:', err);
      const errorObj = err as { response?: { data?: Record<string, string[]> } };
      if (errorObj.response?.data) {
        const messages = Object.values(errorObj.response.data).flat();
        setError(messages.join('. '));
      } else {
        setError('Erro ao realizar transferencia');
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transferir Fio Diamantado</h1>
          <p className="text-sm text-gray-600 mt-1">
            Movimente o fio entre almoxarifado e empreendimentos
          </p>
        </div>
        <Link
          href="/dashboard/fio-diamantado"
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Voltar
        </Link>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Selecao do Fio */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Fio Diamantado *
            </label>
            <select
              name="fio"
              value={formData.fio}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Selecione o fio</option>
              {fios.map(fio => (
                <option key={fio.id} value={fio.id}>
                  {fio.codigo} - {fio.fabricante} ({fio.diametro_atual_mm}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Info do fio selecionado */}
          {fioSelecionado && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Informacoes do Fio</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Codigo</p>
                  <p className="font-medium text-gray-900">{fioSelecionado.codigo}</p>
                </div>
                <div>
                  <p className="text-gray-500">Fabricante</p>
                  <p className="font-medium text-gray-900">{fioSelecionado.fabricante}</p>
                </div>
                <div>
                  <p className="text-gray-500">Diametro Atual</p>
                  <p className="font-medium text-gray-900">{fioSelecionado.diametro_atual_mm} mm</p>
                </div>
                <div>
                  <p className="text-gray-500">Vida Util</p>
                  <p className="font-medium text-gray-900">{fioSelecionado.percentual_vida_util}%</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Localizacao Atual</p>
                  <p className="font-medium text-orange-600">{getLocalizacaoAtual(fioSelecionado)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Destino *
            </label>
            <select
              name="localizacao_destino"
              value={formData.localizacao_destino}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Selecione o destino</option>
              <option value="ALMOXARIFADO">Almoxarifado</option>
              <option value="EMPREENDIMENTO">Empreendimento</option>
            </select>
          </div>

          {/* Empreendimento de destino */}
          {formData.localizacao_destino === 'EMPREENDIMENTO' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Empreendimento de Destino *
              </label>
              <select
                name="empreendimento_destino"
                value={formData.empreendimento_destino}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="">Selecione o empreendimento</option>
                {empreendimentos.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome} {emp.cliente_nome ? `(${emp.cliente_nome})` : ''}
                  </option>
                ))}
              </select>
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
              placeholder="Motivo da transferencia, responsavel, etc..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
          </div>

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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Transferindo...
                </>
              ) : (
                'Realizar Transferencia'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
