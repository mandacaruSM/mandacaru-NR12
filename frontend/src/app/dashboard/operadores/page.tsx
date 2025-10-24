// frontend/src/app/dashboard/operadores/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api, { Operador } from '@/lib/api';
import { formatarCPF } from '@/lib/utils';

interface FiltrosOperador {
  cliente?: number;
  ativo?: boolean;
  telegram_vinculado?: boolean;
  search: string;
}

export default function OperadoresPage() {
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [filtros, setFiltros] = useState<FiltrosOperador>({
    search: '',
    ativo: true,
  });

  // ============================================
  // CARREGAR OPERADORES
  // ============================================

  const carregarOperadores = async () => {
    setCarregando(true);
    setErro('');

    try {
      const { data } = await api.operadores.list({
        search: filtros.search || undefined,
        ativo: filtros.ativo,
        telegram_vinculado: filtros.telegram_vinculado,
        cliente: filtros.cliente,
      });

      setOperadores(data.results || []);
      setTotalPaginas(Math.ceil((data.count || 0) / 20));
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar operadores');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarOperadores();
  }, [filtros]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleExcluir = async (id: number, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir ${nome}?`)) return;

    try {
      await api.operadores.delete(id);
      setOperadores((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir operador');
    }
  };

  const handleGerar CodigoTelegram = async (id: number, nome: string) => {
    try {
      const { codigo, valido_ate } = await api.operadores.gerarCodigoVinculacao(id);
      alert(
        `Código gerado: ${codigo}\nVálido até: ${new Date(valido_ate).toLocaleString('pt-BR')}\n\nCompartilhe este código com ${nome} para vincular ao Telegram.`
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar código');
    }
  };

  const handleDesvinculaTelegram = async (id: number) => {
    if (!confirm('Tem certeza que deseja desvincular o Telegram?')) return;

    try {
      await api.operadores.desvincularTelegram(id);
      carregarOperadores();
    } catch (err: any) {
      alert(err.message || 'Erro ao desvincular Telegram');
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Operadores</h1>
          <Link
            href="/dashboard/operadores/novo"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Novo Operador
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por nome ou CPF
            </label>
            <input
              type="text"
              value={filtros.search}
              onChange={(e) =>
                setFiltros((prev) => ({
                  ...prev,
                  search: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
              placeholder="João Silva..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filtros.ativo === undefined ? 'todos' : filtros.ativo.toString()}
              onChange={(e) => {
                const valor = e.target.value;
                setFiltros((prev) => ({
                  ...prev,
                  ativo: valor === 'todos' ? undefined : valor === 'true',
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="todos">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          {/* Telegram */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram
            </label>
            <select
              value={
                filtros.telegram_vinculado === undefined
                  ? 'todos'
                  : filtros.telegram_vinculado.toString()
              }
              onChange={(e) => {
                const valor = e.target.value;
                setFiltros((prev) => ({
                  ...prev,
                  telegram_vinculado:
                    valor === 'todos' ? undefined : valor === 'true',
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="todos">Todos</option>
              <option value="true">Vinculado</option>
              <option value="false">Não vinculado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded mb-6">
          <p className="text-red-800">{erro}</p>
        </div>
      )}

      {/* Carregando */}
      {carregando && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Tabela */}
      {!carregando && operadores.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Operador
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    CPF
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Clientes
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {operadores.map((operador) => (
                  <tr
                    key={operador.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {operador.foto && (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                            <Image
                              src={operador.foto}
                              alt={operador.nome_completo}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {operador.nome_completo}
                          </p>
                          <p className="text-sm text-gray-500">
                            {operador.telegram_vinculado && (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                ✓ Telegram vinculado
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatarCPF(operador.cpf)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {operador.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {operador.clientes_nomes?.join(', ') || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          operador.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {operador.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/operadores/${operador.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/dashboard/operadores/${operador.id}/editar`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => {
                            if (operador.telegram_vinculado) {
                              handleDesvinculaTelegram(operador.id);
                            } else {
                              handleGerar CodigoTelegram(
                                operador.id,
                                operador.nome_completo
                              );
                            }
                          }}
                          className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                        >
                          {operador.telegram_vinculado
                            ? 'Desvincular Telegram'
                            : 'Telegram'}
                        </button>
                        <button
                          onClick={() =>
                            handleExcluir(operador.id, operador.nome_completo)
                          }
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sem dados */}
      {!carregando && operadores.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Nenhum operador encontrado</p>
          <Link
            href="/dashboard/operadores/novo"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Criar primeiro operador
          </Link>
        </div>
      )}
    </div>
  );
}