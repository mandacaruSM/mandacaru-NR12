// frontend/src/components/TelegramVinculacao.tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface TelegramVinculacaoProps {
  codigoVinculacao?: string | null;
  codigoValidoAte?: string | null;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  telegramVinculadoEm?: string | null;
  onGerarNovoCodigo?: () => Promise<void>;
  showGerarButton?: boolean;
}

export default function TelegramVinculacao({
  codigoVinculacao,
  codigoValidoAte,
  telegramChatId,
  telegramUsername,
  telegramVinculadoEm,
  onGerarNovoCodigo,
  showGerarButton = false,
}: TelegramVinculacaoProps) {
  const toast = useToast();
  const [gerando, setGerando] = useState(false);

  const handleCopiarCodigo = () => {
    if (codigoVinculacao) {
      navigator.clipboard.writeText(codigoVinculacao);
      toast.success('Código copiado!');
    }
  };

  const handleGerarNovo = async () => {
    if (!onGerarNovoCodigo) return;
    try {
      setGerando(true);
      await onGerarNovoCodigo();
      toast.success('Novo código gerado!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar código');
    } finally {
      setGerando(false);
    }
  };

  const formatarDataHora = (dataStr?: string | null) => {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCodigoExpirado = () => {
    if (!codigoValidoAte) return true;
    return new Date(codigoValidoAte) < new Date();
  };

  const isVinculado = Boolean(telegramChatId);

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Telegram</h3>
        {isVinculado ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            ✓ Vinculado
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Não Vinculado
          </span>
        )}
      </div>

      {isVinculado ? (
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-500">Username</div>
            <div className="text-gray-900 font-medium">
              {telegramUsername ? `@${telegramUsername}` : '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Chat ID</div>
            <div className="text-gray-900 font-mono text-sm">{telegramChatId}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Vinculado em</div>
            <div className="text-gray-900">{formatarDataHora(telegramVinculadoEm)}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {codigoVinculacao && !isCodigoExpirado() ? (
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Código de Vinculação
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-mono font-bold text-blue-700 tracking-widest">
                  {codigoVinculacao}
                </div>
                <button
                  onClick={handleCopiarCodigo}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  📋 Copiar
                </button>
              </div>
              <div className="text-sm text-blue-700">
                Válido até: <span className="font-semibold">{formatarDataHora(codigoValidoAte)}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">Como vincular:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Abra o Telegram e busque por <span className="font-mono bg-blue-100 px-1 rounded">@mandacarusmbot</span></li>
                    <li>Envie o comando <span className="font-mono bg-blue-100 px-1 rounded">/vincular</span></li>
                    <li>Digite o código acima quando solicitado</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 text-center">
              <div className="text-gray-500 mb-2">
                {codigoVinculacao && isCodigoExpirado() ? (
                  <>
                    <div className="text-amber-600 font-semibold">⚠️ Código Expirado</div>
                    <div className="text-sm mt-1">
                      O código anterior expirou em {formatarDataHora(codigoValidoAte)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-700 font-semibold">Nenhum código ativo</div>
                    <div className="text-sm mt-1">Gere um código para vincular o Telegram</div>
                  </>
                )}
              </div>
            </div>
          )}

          {showGerarButton && onGerarNovoCodigo && (
            <button
              onClick={handleGerarNovo}
              disabled={gerando}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {gerando ? 'Gerando...' : (codigoVinculacao && !isCodigoExpirado() ? '🔄 Gerar Novo Código' : '✨ Gerar Código')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
