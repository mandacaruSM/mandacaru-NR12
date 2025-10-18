// frontend/src/app/dashboard/nr12/checklists/novo/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { 
  nr12Api, 
  equipamentosApi, 
  ModeloChecklist, 
  Equipamento, 
  RespostaItemChecklist, // ✅ CORRIGIDO: Nome correto do tipo
  ItemChecklist 
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

interface RespostaTemp {
  item_id: number;
  pergunta: string;
  tipo_resposta: string;
  categoria: string;
  resposta: 'CONFORME' | 'NAO_CONFORME' | 'SIM' | 'NAO' | 'NA' | null;
  valor_numerico: string;
  valor_texto: string;
  observacao: string;
}

export default function NovoChecklistPage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [itensChecklist, setItensChecklist] = useState<ItemChecklist[]>([]);

  const [modeloSelecionado, setModeloSelecionado] = useState<number | null>(null);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<number | null>(null);
  const [leituraEquipamento, setLeituraEquipamento] = useState('');
  const [operadorNome, setOperadorNome] = useState('');

  const [respostas, setRespostas] = useState<RespostaTemp[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (modeloSelecionado) {
      loadItensModelo(modeloSelecionado);
    }
  }, [modeloSelecionado]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [modelosRes, equipamentosRes] = await Promise.all([
        nr12Api.modelos.list({ ativo: true }),
        equipamentosApi.list(), // ✅ CORRIGIDO: Sem filtro 'ativo'
      ]);
      setModelos(modelosRes.results);
      // Filtrar equipamentos ativos manualmente
      setEquipamentos(equipamentosRes.results.filter(eq => eq.ativo));
    } catch (err: any) {
      toast.error('Erro ao carregar dados iniciais');
    } finally {
      setLoadingData(false);
    }
  };

  const loadItensModelo = async (modeloId: number) => {
    try {
      const response = await nr12Api.itens.list({ modelo: modeloId });
      const itens = response.results.filter(item => item.ativo).sort((a, b) => a.ordem - b.ordem);
      setItensChecklist(itens);
      
      // Inicializar respostas vazias
      const respostasVazias: RespostaTemp[] = itens.map(item => ({
        item_id: item.id,
        pergunta: item.pergunta,
        tipo_resposta: item.tipo_resposta,
        categoria: item.categoria,
        resposta: null,
        valor_numerico: '',
        valor_texto: '',
        observacao: '',
      }));
      setRespostas(respostasVazias);
      setCurrentItemIndex(0);
    } catch (err: any) {
      toast.error('Erro ao carregar itens do checklist');
    }
  };

  const handleRespostaChange = (field: keyof RespostaTemp, value: any) => {
    const novasRespostas = [...respostas];
    novasRespostas[currentItemIndex] = {
      ...novasRespostas[currentItemIndex],
      [field]: value,
    };
    setRespostas(novasRespostas);
  };

  const handleProximoItem = () => {
    if (currentItemIndex < itensChecklist.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const handleItemAnterior = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!modeloSelecionado || !equipamentoSelecionado) {
      toast.error('Selecione modelo e equipamento');
      return;
    }

    // Verificar se todos os itens obrigatórios foram respondidos
    const itensObrigatorios = itensChecklist.filter(item => item.obrigatorio);
    const respostasObrigatorias = respostas.filter((resp, index) => {
      const item = itensChecklist[index];
      return item.obrigatorio && (resp.resposta || resp.valor_numerico || resp.valor_texto);
    });

    if (respostasObrigatorias.length < itensObrigatorios.length) {
      toast.error('Responda todos os itens obrigatórios antes de finalizar');
      return;
    }

    setLoading(true);

    try {
      // 1. Criar checklist
      console.log('🔷 Criando checklist...');
      const checklist = await nr12Api.checklists.create({
        modelo: modeloSelecionado,
        equipamento: equipamentoSelecionado,
        leitura_equipamento: leituraEquipamento || null,
        operador_nome: operadorNome || 'Não informado',
        origem: 'WEB',
        status: 'EM_ANDAMENTO',
      });
      console.log('✅ Checklist criado:', checklist.id);

      // 2. Registrar todas as respostas
      const respostasValidas = respostas.filter(resp => 
        resp.resposta || resp.valor_numerico || resp.valor_texto
      );

      console.log(`🔷 Registrando ${respostasValidas.length} respostas...`);
      for (const resp of respostasValidas) {
        const respostaPayload = {
          checklist: checklist.id,  // ✅ CRÍTICO: ID do checklist
          item: resp.item_id,
          resposta: resp.resposta || null,
          valor_numerico: resp.valor_numerico || null,
          valor_texto: resp.valor_texto || '',
          observacao: resp.observacao || '',
        };
        
        console.log('📤 Enviando resposta:', respostaPayload);
        await nr12Api.respostas.create(respostaPayload);
      }
      console.log('✅ Respostas registradas');

      // 3. Finalizar checklist
      console.log('🔷 Finalizando checklist...');
      await nr12Api.checklists.finalizar(checklist.id);
      console.log('✅ Checklist finalizado');

      toast.success('Checklist realizado com sucesso!');
      router.push(`/dashboard/nr12/checklists/${checklist.id}`);
    } catch (err: any) {
      console.error('❌ Erro ao salvar checklist:', err);
      toast.error('Erro ao salvar checklist: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const itemAtual = itensChecklist[currentItemIndex];
  const respostaAtual = respostas[currentItemIndex];
  const progresso = itensChecklist.length > 0 ? ((currentItemIndex + 1) / itensChecklist.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/nr12" className="hover:text-blue-600">NR12</Link>
          <span>/</span>
          <Link href="/dashboard/nr12/checklists" className="hover:text-blue-600">Checklists</Link>
          <span>/</span>
          <span>Novo</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Realizar Checklist</h1>
        <p className="text-gray-600 mt-1">Preencha o checklist de segurança NR12</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção Inicial */}
        {!modeloSelecionado && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Selecione o Modelo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelos.map(modelo => (
                <button
                  key={modelo.id}
                  type="button"
                  onClick={() => setModeloSelecionado(modelo.id)}
                  className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900">{modelo.nome}</h3>
                  <p className="text-sm text-gray-600">{modelo.tipo_equipamento_nome}</p>
                  <p className="text-xs text-gray-500 mt-1">{modelo.total_itens} itens</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {modeloSelecionado && !equipamentoSelecionado && (
          <div className="bg-white rounded-lg shadow p-6">
            <button
              type="button"
              onClick={() => setModeloSelecionado(null)}
              className="text-blue-600 hover:underline mb-4"
            >
              ← Trocar modelo
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Selecione o Equipamento</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Operador
              </label>
              <input
                type="text"
                value={operadorNome}
                onChange={(e) => setOperadorNome(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Digite o nome do operador"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipamentos.map(eq => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => setEquipamentoSelecionado(eq.id)}
                  className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900">{eq.codigo}</h3>
                  <p className="text-sm text-gray-600">{eq.descricao}</p>
                  <p className="text-xs text-gray-500">{eq.cliente_nome}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Perguntas do Checklist */}
        {modeloSelecionado && equipamentoSelecionado && itemAtual && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Pergunta {currentItemIndex + 1} de {itensChecklist.length}
                  </span>
                  <span className="text-sm font-medium text-blue-600">{Math.round(progresso)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mb-3">
                  {itemAtual.categoria}
                </span>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{itemAtual.pergunta}</h2>
                {itemAtual.descricao_ajuda && (
                  <p className="text-sm text-gray-600">{itemAtual.descricao_ajuda}</p>
                )}
              </div>

              {/* Campos de Resposta */}
              <div className="space-y-4">
                {itemAtual.tipo_resposta === 'CONFORME' && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleRespostaChange('resposta', 'CONFORME')}
                      className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                        respostaAtual?.resposta === 'CONFORME'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">✓</div>
                      <div className="font-semibold text-gray-900">Conforme</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespostaChange('resposta', 'NAO_CONFORME')}
                      className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                        respostaAtual?.resposta === 'NAO_CONFORME'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-red-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">✗</div>
                      <div className="font-semibold text-gray-900">Não Conforme</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespostaChange('resposta', 'NA')}
                      className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                        respostaAtual?.resposta === 'NA'
                          ? 'border-gray-500 bg-gray-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-4xl mb-2">—</div>
                      <div className="font-semibold text-gray-900">N/A</div>
                    </button>
                  </div>
                )}

                {itemAtual.tipo_resposta === 'SIM_NAO' && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleRespostaChange('resposta', 'SIM')}
                      className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                        respostaAtual?.resposta === 'SIM'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">👍</div>
                      <div className="font-semibold text-gray-900">Sim</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespostaChange('resposta', 'NAO')}
                      className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                        respostaAtual?.resposta === 'NAO'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-red-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">👎</div>
                      <div className="font-semibold text-gray-900">Não</div>
                    </button>
                  </div>
                )}

                {itemAtual.tipo_resposta === 'NUMERO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Numérico
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={respostaAtual?.valor_numerico || ''}
                      onChange={(e) => handleRespostaChange('valor_numerico', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Digite o valor"
                    />
                  </div>
                )}

                {itemAtual.tipo_resposta === 'TEXTO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resposta
                    </label>
                    <textarea
                      value={respostaAtual?.valor_texto || ''}
                      onChange={(e) => handleRespostaChange('valor_texto', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      rows={3}
                      placeholder="Digite sua resposta"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações {respostaAtual?.resposta === 'NAO_CONFORME' && '(Obrigatório)'}
                  </label>
                  <textarea
                    value={respostaAtual?.observacao || ''}
                    onChange={(e) => handleRespostaChange('observacao', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    rows={2}
                    placeholder="Adicione observações se necessário"
                  />
                </div>
              </div>

              {/* Navegação */}
              <div className="flex justify-between mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleItemAnterior}
                  disabled={currentItemIndex === 0}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>

                {currentItemIndex < itensChecklist.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleProximoItem}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Próximo →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : '✓ Finalizar Checklist'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}