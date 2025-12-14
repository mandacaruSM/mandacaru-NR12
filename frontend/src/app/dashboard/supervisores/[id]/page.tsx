// frontend/src/app/dashboard/supervisores/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supervisoresApi, Supervisor } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import TelegramVinculacao from '@/components/TelegramVinculacao';

export default function SupervisorDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [item, setItem] = useState<Supervisor | null>(null);
  const [loading, setLoading] = useState(true);

  const id = Number(params?.id);

  const carregarDados = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await supervisoresApi.retrieve(id);
      setItem(data);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar supervisor');
      router.push('/dashboard/supervisores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [id]);

  const handleGerarCodigo = async () => {
    // TODO: Implementar endpoint para gerar código
    // Por enquanto, apenas recarrega os dados
    await carregarDados();
  };

  if (loading) {
    return <div className="text-center text-gray-500">Carregando...</div>;
  }

  if (!item) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervisor #{item.id}</h1>
          <p className="text-gray-600">Detalhes do supervisor</p>
        </div>
        <div className="space-x-3">
          <Link href={`/dashboard/supervisores/${item.id}/editar`} className="px-4 py-2 bg-gray-800 text-white rounded-lg">
            Editar
          </Link>
          <Link href="/dashboard/supervisores" className="text-blue-600 hover:underline">Voltar</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Dados Pessoais */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Pessoais</h3>
            <div>
              <div className="text-sm text-gray-500">Nome completo</div>
              <div className="text-gray-900 font-medium">{item.nome_completo}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">CPF</div>
                <div className="text-gray-900">{item.cpf}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Telefone</div>
                <div className="text-gray-900">{item.telefone || '-'}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className={item.ativo ? 'text-green-700' : 'text-red-700'}>
                {item.ativo ? 'Ativo' : 'Inativo'}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 3: Telegram */}
        <div className="lg:col-span-1">
          <TelegramVinculacao
            codigoVinculacao={(item as any).codigo_vinculacao}
            codigoValidoAte={(item as any).codigo_valido_ate}
            telegramChatId={(item as any).telegram_chat_id}
            telegramUsername={(item as any).telegram_username}
            telegramVinculadoEm={(item as any).telegram_vinculado_em}
            onGerarNovoCodigo={handleGerarCodigo}
            showGerarButton={true}
          />
        </div>
      </div>
    </div>
  );
}

