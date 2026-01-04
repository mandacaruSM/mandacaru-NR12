'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { abastecimentosApi, type Abastecimento } from '@/lib/api';

export default function AbastecimentoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [item, setItem] = useState<Abastecimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    loadAbastecimento();
  }, [id]);

  async function loadAbastecimento() {
    try {
      setLoading(true);
      setErro(null);
      const data = await abastecimentosApi.get(id);
      setItem(data);
    } catch (e: any) {
      console.error('Erro ao carregar abastecimento:', e);
      setErro(e.message || 'Erro ao carregar abastecimento');
    } finally {
      setLoading(false);
    }
  }

  async function excluir() {
    if (!confirm('Tem certeza que deseja excluir este abastecimento?')) return;
    try {
      await abastecimentosApi.delete(id);
      router.push('/dashboard/abastecimentos');
    } catch (e: any) {
      console.error('Erro ao excluir abastecimento:', e);
      alert(e.message || 'Erro ao excluir');
    }
  }

  function formatarData(data: string) {
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
  }

  function formatarDataHora(data: string) {
    try {
      return new Date(data).toLocaleString('pt-BR');
    } catch {
      return data;
    }
  }

  function formatarValor(valor: string) {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando abastecimento...</p>
        </div>
      </div>
    );
  }

  if (erro || !item) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Abastecimento</h1>
          <Link
            href="/dashboard/abastecimentos"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voltar
          </Link>
        </div>

        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{erro || 'Abastecimento não encontrado'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Detalhes do Abastecimento</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard/abastecimentos"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voltar
          </Link>
          <button
            onClick={excluir}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Card Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Abastecimento #{item.id}
              </h2>
              <p className="text-sm text-gray-900 mt-1">
                {formatarData(item.data)}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {item.tipo_combustivel_display}
            </span>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Equipamento */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Equipamento</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{item.equipamento_codigo}</p>
                  <p className="text-sm text-gray-900">{item.equipamento_descricao}</p>
                </div>
                <Link
                  href={`/dashboard/equipamentos/${item.equipamento}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Ver equipamento →
                </Link>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Leitura no abastecimento:</span>{' '}
                  {parseFloat(item.horimetro_km).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Valores</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">Quantidade</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {parseFloat(item.quantidade_litros).toFixed(2)} L
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">Valor Total</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatarValor(item.valor_total)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">Valor Unitário</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {item.valor_unitario ? formatarValor(item.valor_unitario) : 'N/A'}<span className="text-sm">/L</span>
                </p>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Informações Adicionais</h3>
            <div className="space-y-3">
              {item.operador_nome && (
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Operador</p>
                    <p className="text-sm text-gray-900">{item.operador_nome}</p>
                  </div>
                </div>
              )}

              {item.local && (
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Local</p>
                    <p className="text-sm text-gray-900">{item.local}</p>
                  </div>
                </div>
              )}

              {item.numero_nota && (
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Nota Fiscal</p>
                    <p className="text-sm text-gray-900">{item.numero_nota}</p>
                  </div>
                </div>
              )}

              {item.observacoes && (
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Observações</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{item.observacoes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controle de Estoque */}
          {(item.produto_nome || item.local_estoque_nome) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Controle de Estoque</h3>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-green-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Movimento de estoque registrado</p>
                    {item.produto_nome && (
                      <p className="text-sm text-green-700 mt-1">Produto: {item.produto_nome}</p>
                    )}
                    {item.local_estoque_nome && (
                      <p className="text-sm text-green-700">Local: {item.local_estoque_nome}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metadados */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
              <div>
                <span className="font-medium">Criado em:</span>{' '}
                {formatarDataHora(item.created_at)}
              </div>
              <div>
                <span className="font-medium">Atualizado em:</span>{' '}
                {formatarDataHora(item.updated_at)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
