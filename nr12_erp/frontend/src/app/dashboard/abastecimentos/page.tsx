'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { abastecimentosApi, equipamentosApi, cadastroApi, type Abastecimento, type Equipamento } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AbastecimentosPage() {
  const { user } = useAuth();
  const isCliente = user?.profile?.role === 'CLIENTE';
  const [items, setItems] = useState<Abastecimento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Listas para filtros hierárquicos
  const [clientes, setClientes] = useState<any[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState<number | undefined>();
  const [filtroEmpreendimento, setFiltroEmpreendimento] = useState<number | undefined>();
  const [filtroEquipamento, setFiltroEquipamento] = useState<number | undefined>();
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');
  const [filtroTipoCombustivel, setFiltroTipoCombustivel] = useState<string>('');

  // Carregar clientes ao montar o componente
  useEffect(() => {
    if (!isCliente) {
      carregarClientes();
    }
  }, []);

  // Carregar empreendimentos quando cliente é selecionado
  useEffect(() => {
    if (filtroCliente) {
      carregarEmpreendimentos(filtroCliente);
    } else {
      setEmpreendimentos([]);
      setFiltroEmpreendimento(undefined);
    }
  }, [filtroCliente]);

  // Carregar equipamentos quando empreendimento é selecionado
  useEffect(() => {
    if (filtroEmpreendimento) {
      carregarEquipamentos(filtroEmpreendimento);
    } else if (filtroCliente) {
      // Se tem cliente mas não empreendimento, carregar equipamentos do cliente
      carregarEquipamentosPorCliente(filtroCliente);
    } else {
      // Se não tem filtro, carregar todos
      carregarEquipamentos();
    }
  }, [filtroEmpreendimento, filtroCliente]);

  // Recarregar abastecimentos quando filtros mudam
  useEffect(() => {
    loadData();
  }, [filtroEquipamento, filtroDataInicio, filtroDataFim, filtroTipoCombustivel]);

  async function carregarClientes() {
    try {
      const response = await cadastroApi.clientes.list();
      setClientes(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  async function carregarEmpreendimentos(clienteId: number) {
    try {
      const response = await cadastroApi.empreendimentos.list({ cliente: clienteId });
      setEmpreendimentos(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
    }
  }

  async function carregarEquipamentos(empreendimentoId?: number) {
    try {
      const params = empreendimentoId ? { empreendimento: empreendimentoId } : {};
      const response = await equipamentosApi.list(params);
      setEquipamentos(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  }

  async function carregarEquipamentosPorCliente(clienteId: number) {
    try {
      const response = await equipamentosApi.list({ cliente: clienteId });
      setEquipamentos(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setErro(null);

      // Carregar abastecimentos com filtros
      const abastData = await abastecimentosApi.list({
        equipamento: filtroEquipamento,
        data_inicio: filtroDataInicio || undefined,
        data_fim: filtroDataFim || undefined,
        tipo_combustivel: filtroTipoCombustivel || undefined,
      });

      setItems(abastData.results || []);
    } catch (e: any) {
      console.error('Erro ao carregar abastecimentos:', e);
      setErro(e.message || 'Erro ao carregar abastecimentos');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm('Tem certeza que deseja excluir este abastecimento?')) return;
    try {
      await abastecimentosApi.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
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

  function formatarValor(valor: string) {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function limparFiltros() {
    setFiltroCliente(undefined);
    setFiltroEmpreendimento(undefined);
    setFiltroEquipamento(undefined);
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroTipoCombustivel('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Abastecimentos</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Início
          </Link>
          {!isCliente && (
            <Link
              href="/dashboard/abastecimentos/novo"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              + Novo Abastecimento
            </Link>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Filtros</h2>
        <div className={`grid grid-cols-1 ${isCliente ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 mb-4`}>
          {!isCliente && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Cliente
              </label>
              <select
                value={filtroCliente || ''}
                onChange={(e) => setFiltroCliente(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="" className="text-gray-900 bg-white">Todos os clientes</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id} className="text-gray-900 bg-white">
                    {cliente.nome_razao}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Empreendimento
            </label>
            <select
              value={filtroEmpreendimento || ''}
              onChange={(e) => setFiltroEmpreendimento(e.target.value ? Number(e.target.value) : undefined)}
              disabled={!filtroCliente}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="" className="text-gray-900 bg-white">Todos os empreendimentos</option>
              {empreendimentos.map((emp) => (
                <option key={emp.id} value={emp.id} className="text-gray-900 bg-white">
                  {emp.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Equipamento
            </label>
            <select
              value={filtroEquipamento || ''}
              onChange={(e) => setFiltroEquipamento(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="" className="text-gray-900 bg-white">Todos os equipamentos</option>
              {equipamentos.map((eq) => (
                <option key={eq.id} value={eq.id} className="text-gray-900 bg-white">
                  {eq.codigo} - {eq.descricao}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Tipo de Combustível
            </label>
            <select
              value={filtroTipoCombustivel}
              onChange={(e) => setFiltroTipoCombustivel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="" className="text-gray-900 bg-white">Todos</option>
              <option value="DIESEL" className="text-gray-900 bg-white">Diesel</option>
              <option value="GASOLINA" className="text-gray-900 bg-white">Gasolina</option>
              <option value="ETANOL" className="text-gray-900 bg-white">Etanol</option>
              <option value="GNV" className="text-gray-900 bg-white">GNV</option>
              <option value="OUTRO" className="text-gray-900 bg-white">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={limparFiltros}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-900">Carregando abastecimentos...</p>
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
              <h3 className="text-sm font-medium text-red-800">Erro</h3>
              <p className="mt-1 text-sm text-red-700">{erro}</p>
              <button
                onClick={loadData}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !erro && items.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum abastecimento encontrado</h3>
          <p className="mt-2 text-sm text-gray-500">
            Comece criando um novo abastecimento.
          </p>
          {!isCliente && (
            <div className="mt-6">
              <Link
                href="/dashboard/abastecimentos/novo"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                + Novo Abastecimento
              </Link>
            </div>
          )}
        </div>
      )}

      {!loading && !erro && items.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Combustível
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horímetro/KM
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarData(item.data)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.equipamento_codigo}</div>
                      <div className="text-sm text-gray-500">{item.equipamento_descricao}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.tipo_combustivel_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(item.quantidade_litros).toFixed(2)} L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatarValor(item.valor_total)}</div>
                      {item.valor_unitario && (
                        <div className="text-xs text-gray-500">
                          {formatarValor(item.valor_unitario)}/L
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(item.horimetro_km).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/abastecimentos/${item.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => excluir(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Total de abastecimentos: <span className="font-medium">{items.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
