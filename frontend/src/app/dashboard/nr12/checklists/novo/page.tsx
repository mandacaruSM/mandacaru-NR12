// frontend/src/app/dashboard/nr12/checklists/novo/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { nr12Api, equipamentosApi, type ModeloChecklist, type Equipamento, type ItemChecklist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const CATEGORIA_LABELS: Record<string, string> = {
  'VISUAL': '👁️ Visual',
  'FUNCIONAL': '⚙️ Funcional',
  'MEDICAO': '📏 Medição',
  'LIMPEZA': '🧹 Limpeza',
  'LUBRIFICACAO': '🛢️ Lubrificação',
  'DOCUMENTACAO': '📄 Documentação',
  'SEGURANCA': '🔒 Segurança',
  'OUTROS': '📋 Outros',
};

export default function NovoChecklistPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(1); // 1: Seleção, 2: Execução
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dados para seleção
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [selectedEquipamento, setSelectedEquipamento] = useState<number | null>(null);
  const [selectedModelo, setSelectedModelo] = useState<number | null>(null);
  const [leituraEquipamento, setLeituraEquipamento] = useState('');

  // Dados do checklist
  const [checklistId, setChecklistId] = useState<number | null>(null);
  const [itens, setItens] = useState<ItemChecklist[]>([]);
  const [respostas, setRespostas] = useState<Record<number, any>>({});

  useEffect(() => {
    loadEquipamentos();
  }, []);

  useEffect(() => {
    if (selectedEquipamento) {
      loadModelos();
    }
  }, [selectedEquipamento]);

  const loadEquipamentos = async () => {
    try {
      const response = await equipamentosApi.list();
      setEquipamentos(response.results.filter(eq => eq.ativo));
    } catch (err: any) {
      toast.error('Erro ao carregar equipamentos');
    }
  };

  const loadModelos = async () => {
    try {
      setLoading(true);
      const equipamento = equipamentos.find(eq => eq.id === selectedEquipamento);
      if (!equipamento) return;

      const response = await nr12Api.modelos.list({ 
        tipo_equipamento: equipamento.tipo,
        ativo: true 
      });
      setModelos(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoading(false);
    }
  };

  const handleIniciar = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedEquipamento || !selectedModelo) {
      toast.error('Selecione o equipamento e o modelo');
      return;
    }

    try {
      setSaving(true);

      // Criar o checklist
      const checklist = await nr12Api.checklists.create({
        equipamento: selectedEquipamento,
        modelo: selectedModelo,
        leitura_equipamento: leituraEquipamento || null,
        origem: 'WEB',
        status: 'EM_ANDAMENTO',
      });

      setChecklistId(checklist.id);

      // Carregar itens do modelo
      const modelo = await nr12Api.modelos.get(selectedModelo);
      setItens(modelo.itens || []);

      // Inicializar respostas vazias
      const respostasIniciais: Record<number, any> = {};
      (modelo.itens || []).forEach(item => {
        respostasIniciais[item.id] = {
          item: item.id,
          resposta: null,
          valor_numerico: null,
          valor_texto: '',
          observacao: '',
        };
      });
      setRespostas(respostasIniciais);

      setStep(2);
      toast.success('Checklist iniciado!');
    } catch (err: any) {
      toast.error('Erro ao iniciar checklist');
    } finally {
      setSaving(false);
    }
  };

  const handleRespostaChange = (itemId: number, field: string, value: any) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSalvarResposta = async (itemId: number) => {
    if (!checklistId) return;

    const resposta = respostas[itemId];
    if (!resposta.resposta && resposta.tipo_resposta !== 'TEXTO' && !resposta.valor_texto) {
      toast.error('Responda o item antes de salvar');
      return;
    }

    try {
      await nr12Api.respostas.create(checklistId, {
        ...resposta,
        checklist: checklistId,
      });
      toast.success('Resposta salva!');
    } catch (err: any) {
      toast.error('Erro ao salvar resposta');
    }
  };

  const handleFinalizar = async () => {
    if (!checklistId) return;

    // Verificar se todos os itens obrigatórios foram respondidos
    const itensObrigatorios = itens.filter(item => item.obrigatorio);
    const respostasObrigatorias = itensObrigatorios.every(item => {
      const resposta = respostas[item.id];
      return resposta && (resposta.resposta || resposta.valor_texto || resposta.valor_numerico);
    });

    if (!respostasObrigatorias) {
      toast.error('Responda todos os itens obrigatórios antes de finalizar');
      return;
    }

    const observacoes = prompt('Observações gerais (opcional):');

    try {
      setSaving(true);
      await nr12Api.checklists.finalizar(checklistId, observacoes || undefined);
      toast.success('Checklist finalizado com sucesso!');
      router.push(`/dashboard/nr12/checklists/${checklistId}`);
    } catch (err: any) {
      toast.error('Erro ao finalizar checklist');
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/dashboard/nr12" className="hover:text-blue-600">
                NR12
              </Link>
              <span>/</span>
              <Link href="/dashboard/nr12/checklists" className="hover:text-blue-600">
                Checklists
              </Link>
              <span>/</span>
              <span>Novo</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Realizar Novo Checklist</h1>
            <p className="text-gray-600 mt-1">Selecione o equipamento e o modelo</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleIniciar} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* Equipamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipamento *
              </label>
              <select
                value={selectedEquipamento || ''}
                onChange={(e) => setSelectedEquipamento(Number(e.target.value))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
              >
                <option value="">Selecione o equipamento</option>
                {equipamentos.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.codigo} - {eq.descricao}
                  </option>
                ))}
              </select>
            </div>

            {/* Modelo */}
            {selectedEquipamento && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo de Checklist *
                </label>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : modelos.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Nenhum modelo disponível para este tipo de equipamento.
                    </p>
                    <Link 
                      href="/dashboard/nr12/modelos/novo" 
                      className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                    >
                      Criar novo modelo
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedModelo || ''}
                    onChange={(e) => setSelectedModelo(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
                  >
                    <option value="">Selecione o modelo</option>
                    {modelos.map(modelo => (
                      <option key={modelo.id} value={modelo.id}>
                        {modelo.nome} ({modelo.total_itens} itens)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Leitura */}
            {selectedEquipamento && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leitura do Equipamento (opcional)
                </label>
                <input
                  type="text"
                  value={leituraEquipamento}
                  onChange={(e) => setLeituraEquipamento(e.target.value)}
                  placeholder="Ex: 12345 km ou 5678 horas"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <Link
              href="/dashboard/nr12/checklists"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !selectedEquipamento || !selectedModelo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Iniciando...' : 'Iniciar Checklist'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 2: Execução
  const itensAgrupados = itens.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, ItemChecklist[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Executando Checklist</h1>
            <p className="text-gray-600 mt-1">
              {itens.length} itens • Checklist #{checklistId}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleFinalizar}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Finalizando...' : '✓ Finalizar Checklist'}
            </button>
          </div>
        </div>
      </div>

      {/* Progresso */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progresso</span>
          <span className="text-sm text-gray-600">
            {Object.values(respostas).filter(r => r.resposta || r.valor_texto || r.valor_numerico).length} / {itens.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(Object.values(respostas).filter(r => r.resposta || r.valor_texto || r.valor_numerico).length / itens.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Itens por Categoria */}
      {Object.entries(itensAgrupados).map(([categoria, itensCategoria]) => (
        <div key={categoria} className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {CATEGORIA_LABELS[categoria] || categoria}
            </h2>
            <p className="text-sm text-gray-600">{itensCategoria.length} item(ns)</p>
          </div>
          <div className="p-6 space-y-6">
            {itensCategoria.map((item) => {
              const resposta = respostas[item.id] || {};
              const respondido = resposta.resposta || resposta.valor_texto || resposta.valor_numerico;

              return (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-lg border-2 ${
                    respondido ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">
                        {item.pergunta}
                        {item.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      {item.descricao_ajuda && (
                        <p className="text-sm text-gray-600">{item.descricao_ajuda}</p>
                      )}
                    </div>
                    {respondido && (
                      <span className="text-green-600 text-xl ml-4">✓</span>
                    )}
                  </div>

                  {/* Tipo de Resposta */}
                  {(item.tipo_resposta === 'SIM_NAO' || item.tipo_resposta === 'CONFORME') && (
                    <div className="flex gap-3 mb-3">
                      {item.tipo_resposta === 'CONFORME' ? (
                        <>
                          <button
                            onClick={() => handleRespostaChange(item.id, 'resposta', 'CONFORME')}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                              resposta.resposta === 'CONFORME'
                                ? 'border-green-500 bg-green-100 text-green-800'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-green-500'
                            }`}
                          >
                            ✓ Conforme
                          </button>
                          <button
                            onClick={() => handleRespostaChange(item.id, 'resposta', 'NAO_CONFORME')}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                              resposta.resposta === 'NAO_CONFORME'
                                ? 'border-red-500 bg-red-100 text-red-800'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-red-500'
                            }`}
                          >
                            ✗ Não Conforme
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRespostaChange(item.id, 'resposta', 'SIM')}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                              resposta.resposta === 'SIM'
                                ? 'border-green-500 bg-green-100 text-green-800'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-green-500'
                            }`}
                          >
                            ✓ Sim
                          </button>
                          <button
                            onClick={() => handleRespostaChange(item.id, 'resposta', 'NAO')}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                              resposta.resposta === 'NAO'
                                ? 'border-red-500 bg-red-100 text-red-800'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-red-500'
                            }`}
                          >
                            ✗ Não
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleRespostaChange(item.id, 'resposta', 'NA')}
                        className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                          resposta.resposta === 'NA'
                            ? 'border-gray-500 bg-gray-100 text-gray-800'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                        }`}
                      >
                        N/A
                      </button>
                    </div>
                  )}

                  {item.tipo_resposta === 'NUMERO' && (
                    <input
                      type="number"
                      step="0.01"
                      value={resposta.valor_numerico || ''}
                      onChange={(e) => handleRespostaChange(item.id, 'valor_numerico', e.target.value)}
                      placeholder="Digite o valor"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 mb-3"
                    />
                  )}

                  {item.tipo_resposta === 'TEXTO' && (
                    <textarea
                      value={resposta.valor_texto || ''}
                      onChange={(e) => handleRespostaChange(item.id, 'valor_texto', e.target.value)}
                      placeholder="Digite a resposta"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 mb-3"
                    />
                  )}

                  {/* Observação */}
                  {(resposta.resposta === 'NAO_CONFORME' || resposta.resposta === 'NAO' || item.requer_observacao_nao_conforme) && (
                    <textarea
                      value={resposta.observacao || ''}
                      onChange={(e) => handleRespostaChange(item.id, 'observacao', e.target.value)}
                      placeholder="Observações (obrigatório para não conformidades)"
                      rows={2}
                      className="w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-red-500 mb-3"
                    />
                  )}

                  {/* Botão Salvar */}
                  <button
                    onClick={() => handleSalvarResposta(item.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Salvar Resposta
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}