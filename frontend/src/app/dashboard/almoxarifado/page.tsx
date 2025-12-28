'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { almoxarifadoApi } from '@/lib/api';

export default function AlmoxarifadoPage() {
  const [resumoEstoque, setResumoEstoque] = useState<any>(null);
  const [ultimosMovimentos, setUltimosMovimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [resumo, movimentos] = await Promise.all([
        almoxarifadoApi.estoque.resumo(),
        almoxarifadoApi.movimentos.ultimos(),
      ]);
      setResumoEstoque(resumo);
      setUltimosMovimentos(movimentos);
    } catch (e: any) {
      console.error('Erro ao carregar dashboard:', e);
    } finally {
      setLoading(false);
    }
  }

  function formatarDataHora(data: string) {
    try {
      return new Date(data).toLocaleString('pt-BR');
    } catch {
      return data;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Almoxarifado</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Início
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Total de Itens</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {resumoEstoque?.total_itens || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Com Saldo</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {resumoEstoque?.com_saldo || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Sem Saldo</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {resumoEstoque?.sem_saldo || 0}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Menu de Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/almoxarifado/produtos"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Produtos</h3>
              <p className="text-sm text-gray-900">Gerenciar produtos</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/almoxarifado/estoque"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Estoque</h3>
              <p className="text-sm text-gray-900">Consultar saldos</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/almoxarifado/movimentos"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Movimentos</h3>
              <p className="text-sm text-gray-900">Entradas e saídas</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/almoxarifado/locais"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
        >
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg mr-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Locais</h3>
              <p className="text-sm text-gray-900">Gerenciar locais</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Últimos Movimentos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Últimos Movimentos</h2>
            <Link
              href="/dashboard/almoxarifado/movimentos"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos →
            </Link>
          </div>
        </div>

        {ultimosMovimentos.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum movimento registrado</h3>
            <p className="mt-2 text-sm text-gray-900">
              Os movimentos de estoque aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Local
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ultimosMovimentos.slice(0, 10).map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarDataHora(mov.data_hora)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        mov.tipo === 'ENTRADA'
                          ? 'bg-green-100 text-green-800'
                          : mov.tipo === 'SAIDA'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {mov.tipo_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{mov.produto_codigo}</div>
                      <div className="text-gray-500">{mov.produto_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mov.local_nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {parseFloat(mov.quantidade).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
