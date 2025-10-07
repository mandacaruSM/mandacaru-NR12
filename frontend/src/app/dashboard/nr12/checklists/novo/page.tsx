// frontend/src/app/dashboard/nr12/checklists/novo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { nr12Api, equipamentosApi } from '@/lib/api';
import type { Equipamento, ModeloChecklist, ItemChecklist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type RespostaForm = {
  item_id: number;
  resposta: 'CONFORME' | 'NAO_CONFORME' | 'NA' | '';
  observacao: string;
};

export default function NovoChecklistPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(1); // 1: Seleção, 2: Execução
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [itens, setItens] = useState<ItemChecklist[]>([]);
  
  const [selectedEquipamento, setSelectedEquipamento] = useState<number | null>(null);
  const [selectedModelo, setSelectedModelo] = useState<number | null>(null);
  const [checklistId, setChecklistId] = useState<number | null>(null);
  
  const [respostas, setRespostas] = useState<RespostaForm[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);

  useEffect(() => {
    loadEquipamentos();
  }, []);

  useEffect(() => {
    if (selectedEquipamento) {
      loadModelos();
    }
  }, [selectedEquipamento]);

  useEffect(() => {
    if (selectedModelo) {
      loadItens();
    }
  }, [selectedModelo]);

  const loadEquipamentos = async () => {
    try {
      const response = await equipamentosApi.list();
      // Filtrar apenas equipamentos ativos
      setEquipamentos(response.results.filter(eq => eq.ativo));
    } catch (err) {
      toast.error('Erro ao carregar equipamentos');
    }
  };

  const loadModelos = async () => {
    try {
      const equipamento = equipamentos.find(e => e.id === selectedEquipamento);
      if (!equipamento) return;

      const response = await nr12Api.modelos.list({ 
        tipo_equipamento: equipamento.tipo
      });
      // Filtrar apenas modelos ativos
      setModelos(response.results.filter(m => m.ativo));
    } catch (err) {
      toast.error('Erro ao carregar modelos');
    }
  };

  const loadItens = async () => {
    try {
      setLoadingItens(true);
      const response = await nr12Api.itens.list(selectedModelo!);
      const sortedItens = response.results.sort((a, b) => a.ordem - b.ordem);
      setItens(sortedItens);
      
      // Inicializa respostas vazias
      setRespostas(sortedItens.map(item => ({
        item_id: item.id,
        resposta: '',
        observacao: ''
      })));
    } catch (err) {
      toast.error('Erro ao carregar itens do checklist');
    } finally {
      setLoadingItens(false);
    }
  };

  const handleIniciar = async () => {
    if (!selectedEquipamento || !selectedModelo) {
      toast.error('Selecione equipamento e modelo');
      return;
    }

    try {
      setLoading(true);
      const checklist = await nr12Api.checklists.create({
        equipamento: selectedEquipamento,
        modelo: selectedModelo,
        origem: 'WEB' as const
      });
      setChecklistId(checklist.id);
      setStep(2);
      toast.success('Checklist iniciado!');
    } catch (err: any) {
      toast.error('Erro ao iniciar checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleRespostaChange = (field: keyof RespostaForm, value: any) => {
    const newRespostas = [...respostas];
    newRespostas[currentItemIndex] = {
      ...newRespostas[currentItemIndex],
      [field]: value
    };
    setRespostas(newRespostas);
  };

  const handleSalvarResposta = async () => {
    const respostaAtual = respostas[currentItemIndex];
    
    if (!respostaAtual.resposta) {
      toast.error('Selecione uma conformidade');
      return;
    }

    try {
      setLoading(true);
      await nr12Api.respostas.create(checklistId!, {
        item: respostaAtual.item_id,
        resposta: respostaAtual.resposta,
        observacao: respostaAtual.observacao.trim() || undefined,
      });

      // Avança para próximo item ou finaliza
      if (currentItemIndex < itens.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
        toast.success('Resposta salva!');
      } else {
        // Último item - perguntar se quer finalizar
        const finalizar = confirm('Todas as respostas foram registradas. Deseja finalizar o checklist?');
        if (finalizar) {
          await handleFinalizar();
        } else {
          toast.success('Resposta salva! Clique em Finalizar quando estiver pronto.');
        }
      }
    } catch (err: any) {
      toast.error('Erro ao salvar resposta');
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const handleFinalizar = async () => {
    try {
      setLoading(true);
      const obs = observacoesGerais.trim();
      await nr12Api.checklists.finalizar(checklistId!, {
        observacoes_gerais: obs || undefined
      });
      toast.success('Checklist finalizado com sucesso!');
      router.push(`/dashboard/nr12/checklists/${checklistId}`);
    } catch (err: any) {
      toast.error('Erro ao finalizar checklist');
    } finally {
      setLoading(false);
    }
  };

  const progresso = Math.round(((currentItemIndex + 1) / itens.length) * 100);
  const currentItem = itens[currentItemIndex];
  const currentResposta = respostas[currentItemIndex];

  // STEP 1: Seleção
  if (step === 1) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🆕 Novo Checklist</h1>
              <p className="text-gray-600 mt-1">Selecione o equipamento e modelo</p>
            </div>
            <Link
              href="/dashboard/nr12/checklists"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Cancelar
            </Link>
          </div>

          <div className="space-y-6">
            {/* Equipamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1️⃣ Selecione o Equipamento *
              </label>
              <select
                value={selectedEquipamento || ''}
                onChange={(e) => {
                  setSelectedEquipamento(Number(e.target.value) || null);
                  setSelectedModelo(null);
                  setModelos([]);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um equipamento</option>
                {equipamentos.map((eq) => (
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
                  2️⃣ Selecione o Modelo de Checklist *
                </label>
                <select
                  value={selectedModelo || ''}
                  onChange={(e) => setSelectedModelo(Number(e.target.value) || null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
                  required
                  disabled={loadingItens}
                >
                  <option value="">Selecione um modelo</option>
                  {modelos.map((modelo) => (
                    <option key={modelo.id} value={modelo.id}>
                      {modelo.nome} ({modelo.periodicidade})
                    </option>
                  ))}
                </select>
                {modelos.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ℹ️ Nenhum modelo disponível para este tipo de equipamento
                  </p>
                )}
              </div>
            )}

            {/* Botão Iniciar */}
            {selectedEquipamento && selectedModelo && (
              <div className="pt-4 border-t">
                <button
                  onClick={handleIniciar}
                  disabled={loading || loadingItens}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-semibold"
                >
                  {loading ? 'Iniciando...' : '▶️ Iniciar Checklist'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex">
            <span className="text-2xl mr-3">💡</span>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Como funciona</h3>
              <p className="text-sm text-blue-700 mt-1">
                Após iniciar, você responderá cada item do checklist sequencialmente. 
                É possível voltar para itens anteriores caso necessário.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Execução
  return (
    <div className="space-y-6">
      {/* Header com Progresso */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              📝 Checklist em Andamento
            </h1>
            <p className="text-gray-600 mt-1">
              Item {currentItemIndex + 1} de {itens.length}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-blue-600">{progresso}%</span>
            <p className="text-sm text-gray-600">Completo</p>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Item Atual */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-gray-500 font-bold text-lg">#{currentItemIndex + 1}</span>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentItem?.pergunta || 'Carregando...'}
            </h2>
          </div>
          {currentItem?.categoria && (
            <p className="text-sm text-gray-600">
              Categoria: <span className="font-medium">{currentItem.categoria}</span>
            </p>
          )}
        </div>

        {/* Conformidade */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Conformidade *
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRespostaChange('resposta', 'CONFORME')}
              className={`p-4 rounded-lg border-2 transition-all ${
                currentResposta?.resposta === 'CONFORME'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-green-300'
              }`}
            >
              <span className="text-3xl block mb-2">✅</span>
              <span className="font-semibold">Conforme</span>
            </button>
            <button
              onClick={() => handleRespostaChange('resposta', 'NAO_CONFORME')}
              className={`p-4 rounded-lg border-2 transition-all ${
                currentResposta?.resposta === 'NAO_CONFORME'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-red-300'
              }`}
            >
              <span className="text-3xl block mb-2">❌</span>
              <span className="font-semibold">Não Conforme</span>
            </button>
            <button
              onClick={() => handleRespostaChange('resposta', 'NA')}
              className={`p-4 rounded-lg border-2 transition-all ${
                currentResposta?.resposta === 'NA'
                  ? 'border-gray-500 bg-gray-50 text-gray-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="text-3xl block mb-2">➖</span>
              <span className="font-semibold">N/A</span>
            </button>
          </div>
        </div>

        {/* Observação */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observação (opcional)
          </label>
          <textarea
            value={currentResposta?.observacao || ''}
            onChange={(e) => handleRespostaChange('observacao', e.target.value)}
            rows={4}
            placeholder="Adicione observações sobre este item..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
          />
        </div>

        {/* Botões de Navegação */}
        <div className="flex gap-3">
          {currentItemIndex > 0 && (
            <button
              onClick={handleVoltar}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Voltar
            </button>
          )}
          <button
            onClick={handleSalvarResposta}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold"
          >
            {loading ? 'Salvando...' : currentItemIndex < itens.length - 1 ? 'Próximo →' : '✓ Finalizar'}
          </button>
        </div>
      </div>

      {/* Observações Gerais (último item) */}
      {currentItemIndex === itens.length - 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            💬 Observações Gerais do Checklist
          </h3>
          <textarea
            value={observacoesGerais}
            onChange={(e) => setObservacoesGerais(e.target.value)}
            rows={4}
            placeholder="Adicione observações gerais sobre todo o checklist..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}