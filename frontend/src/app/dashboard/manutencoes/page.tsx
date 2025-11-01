'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Manutencao } from '@/types/manutencao';

export default function ManutencoesPage() {
  const [items, setItems] = useState<Manutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    loadManutencoes();
  }, []);

  async function loadManutencoes() {
    try {
      setLoading(true);
      setErro(null);
      const data = await api<any>('/manutencoes/');

      // A API pode retornar um array direto ou um objeto paginado
      if (Array.isArray(data)) {
        setItems(data);
      } else if (data && Array.isArray(data.results)) {
        // Resposta paginada do Django REST Framework
        setItems(data.results);
      } else if (data && typeof data === 'object') {
        // Pode ser um objeto com chave específica
        setItems([]);
        console.warn('Formato inesperado de resposta da API:', data);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      console.error('Erro ao carregar manutenções:', e);
      setErro(e.message || 'Erro ao carregar manutenções');
      setItems([]); // Garantir que items seja sempre um array
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta manutenção?')) return;
    try {
      const API_BASE_V0 = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:8000/api';
      await fetch(`${API_BASE_V0}/manutencoes/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      console.error('Erro ao excluir manutenção:', e);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manutenções</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Início
          </Link>
          <Link
            href="/dashboard/manutencoes/novo"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Nova Manutenção
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando manutenções...</p>
          </div>
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">{erro}</p>
              <button
                onClick={loadManutencoes}
                className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !erro && (
        <>
          {items.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma manutenção cadastrada</h3>
              <p className="mt-1 text-sm text-gray-500">Comece criando uma nova manutenção.</p>
              <div className="mt-6">
                <Link
                  href="/dashboard/manutencoes/novo"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  + Nova Manutenção
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map(m => (
                <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{m.id}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      m.tipo === 'preventiva'
                        ? 'bg-blue-100 text-blue-700'
                        : m.tipo === 'corretiva'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {m.tipo}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                    {m.equipamento_nome ?? `Equipamento #${m.equipamento}`}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Data:</span>
                      <span className="ml-1">{formatarData(m.data)}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-900">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Horímetro:</span>
                      <span className="ml-1">{m.horimetro}h</span>
                    </div>

                    {m.tecnico_nome && (
                      <div className="flex items-center text-sm text-gray-900">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">Técnico:</span>
                        <span className="ml-1">{m.tecnico_nome}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Link
                      href={`/dashboard/manutencoes/editar/${m.id}`}
                      className="flex-1 px-3 py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => excluir(m.id)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
