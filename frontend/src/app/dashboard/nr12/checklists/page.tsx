// frontend/src/app/dashboard/nr12/checklists/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { nr12Api, equipamentosApi, type ChecklistRealizado, type Equipamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const STATUS_LABELS = {
  'EM_ANDAMENTO': 'Em Andamento',
  'CONCLUIDO': 'Concluído',
  'CANCELADO': 'Cancelado',
};

const STATUS_COLORS = {
  'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
  'CONCLUIDO': 'bg-green-100 text-green-800',
  'CANCELADO': 'bg-gray-100 text-gray-800',
};

const RESULTADO_LABELS = {
  'APROVADO': 'Aprovado',
  'APROVADO_RESTRICAO': 'Aprovado c/ Restrição',
  'REPROVADO': 'Reprovado',
};

const RESULTADO_COLORS = {
  'APROVADO': 'bg-green-100 text-green-800',
  'APROVADO_RESTRICAO': 'bg-yellow-100 text-yellow-800',
  'REPROVADO': 'bg-red-100 text-red-800',
};

export default function ChecklistsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [checklists, setChecklists] = useState<ChecklistRealizado[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterEquipamento, setFilterEquipamento] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || '');
  const [filterResultado, setFilterResultado] = useState<string>(searchParams.get('resultado') || '');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEquipamentos();
    loadChecklists();
  }, []);

  const loadEquipamentos = async () => {
    try {
      const response = await equipamentosApi.list();
      setEquipamentos(response.results);
    } catch (err: any) {
      console.error('Erro ao carregar equipamentos:', err);
    }
  };

  const loadChecklists = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterEquipamento) filters.equipamento = Number(filterEquipamento);
      if (filterStatus) filters.status = filterStatus;
      if (filterResultado) filters.resultado = filterResultado;
      
      const response = await nr12Api.checklists.list(filters);
      setChecklists(response.results);
    } catch (err: any) {
      toast.error('Erro ao carregar checklists');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadChecklists();
  };

  const handleClearFilters = () => {
    setFilterEquipamento('');
    setFilterStatus('');
    setFilterResultado('');
    setSearchTerm('');
    setTimeout(loadChecklists, 0);
  };

  const handleCancelar = async (id: number) => {
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;

    try {
      await nr12Api.checklists.cancelar(id, motivo);
      toast.success('Checklist cancelado com sucesso!');
      loadChecklists();
    } catch (err: any) {
      toast.error('Erro ao cancelar checklist');
    }
  };

  const formatData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR');
  };

  const filteredChecklists = checklists.filter(checklist => {
    const matchSearch = 
      checklist.equipamento_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checklist.modelo_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checklist.operador_nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando checklists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/dashboard/nr12" className="hover:text-blue-600">
                NR12
              </Link>
              <span>/</span>
              <span>Checklists</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Checklists Realizados</h1>
            <p className="text-gray-600 mt-1">
              {filteredChecklists.length} de {checklists.length} checklist(s)
            </p>
          </div>
          <Link
            href="/dashboard/nr12/checklists/novo"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            + Realizar Checklist
          </Link>
        </div>

        {/* Filtros */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
          />

          <select
            value={filterEquipamento}
            onChange={(e) => setFilterEquipamento(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
          >
            <option value="">Todos os equipamentos</option>
            {equipamentos.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.codigo} - {eq.descricao}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>

          <select
            value={filterResultado}
            onChange={(e) => setFilterResultado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
          >
            <option value="">Todos os resultados</option>
            <option value="APROVADO">Aprovado</option>
            <option value="APROVADO_RESTRICAO">Aprovado c/ Restrição</option>
            <option value="REPROVADO">Reprovado</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Filtrar
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Limpar filtros"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredChecklists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">📋 Nenhum checklist encontrado</p>
            <Link
              href="/dashboard/nr12/checklists/novo"
              className="text-blue-600 hover:underline"
            >
              Realizar primeiro checklist
            </Link>
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
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resultado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChecklists.map((checklist) => (
                  <tr key={checklist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatData(checklist.data_hora_inicio)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {checklist.equipamento_codigo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {checklist.equipamento_descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {checklist.modelo_nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {checklist.operador_nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[checklist.status]}`}>
                        {STATUS_LABELS[checklist.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {checklist.resultado_geral ? (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${RESULTADO_COLORS[checklist.resultado_geral]}`}>
                          {RESULTADO_LABELS[checklist.resultado_geral]}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {checklist.total_nao_conformidades > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {checklist.total_nao_conformidades}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/nr12/checklists/${checklist.id}`}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Ver detalhes"
                        >
                          👁️
                        </Link>
                        {checklist.status === 'EM_ANDAMENTO' && (
                          <button
                            onClick={() => handleCancelar(checklist.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        )}
                      </div>
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