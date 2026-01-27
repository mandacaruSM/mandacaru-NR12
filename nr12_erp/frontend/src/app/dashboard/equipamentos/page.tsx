// frontend/src/app/dashboard/equipamentos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { equipamentosApi, clientesApi, empreendimentosApi, Equipamento, Cliente, Empreendimento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import QRCodeModal from '@/components/QRCodeModal';

export default function EquipamentosPage() {
  const toast = useToast();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string>('');

  // QR Code Modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);

  const handleOpenQRCode = (eq: Equipamento) => {
    setSelectedEquipamento(eq);
    setQrModalOpen(true);
  };

  useEffect(() => {
    loadClientes();
    loadEquipamentos();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      loadEmpreendimentos(Number(selectedCliente));
    } else {
      setEmpreendimentos([]);
      setSelectedEmpreendimento('');
    }
  }, [selectedCliente]);

  const loadClientes = async () => {
    try {
      const response = await clientesApi.list();
      setClientes(response.results);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const loadEmpreendimentos = async (clienteId: number) => {
    try {
      const response = await empreendimentosApi.list({ cliente: clienteId });
      setEmpreendimentos(response.results);
    } catch (err: any) {
      console.error('Erro ao carregar empreendimentos:', err);
    }
  };

  const loadEquipamentos = async (filters?: { cliente?: number; empreendimento?: number; search?: string }) => {
    try {
      setLoading(true);
      setError('');
      const response = await equipamentosApi.list(filters);
      setEquipamentos(response.results);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar equipamentos';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: any = {};
    if (searchTerm) filters.search = searchTerm;
    if (selectedCliente) filters.cliente = Number(selectedCliente);
    if (selectedEmpreendimento) filters.empreendimento = Number(selectedEmpreendimento);
    loadEquipamentos(filters);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCliente('');
    setSelectedEmpreendimento('');
    setEmpreendimentos([]);
    loadEquipamentos();
  };

  const handleDelete = async (id: number, codigo: string) => {
    if (!confirm(`Deseja realmente excluir o equipamento "${codigo}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await equipamentosApi.delete(id);
      toast.success('Equipamento excluído com sucesso!');
      await loadEquipamentos();
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao excluir equipamento';
      setError(errorMsg);
      toast.error(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading && equipamentos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando equipamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
              <p className="text-gray-900 mt-1">
                {equipamentos.length} equipamento{equipamentos.length !== 1 ? 's' : ''} cadastrado{equipamentos.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Link
              href="/dashboard/equipamentos/novo"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              + Novo Equipamento
            </Link>
          </div>

          {/* Filtros */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Buscar por código, modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
            />

            <select
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500"
            >
              <option value="">Todos os clientes</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome_razao}
                </option>
              ))}
            </select>

            <select
              value={selectedEmpreendimento}
              onChange={(e) => setSelectedEmpreendimento(e.target.value)}
              disabled={!selectedCliente}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Todos os empreendimentos</option>
              {empreendimentos.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nome}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔍 Buscar
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Lista de Equipamentos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {equipamentos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum equipamento encontrado</p>
            <Link
              href="/dashboard/equipamentos/novo"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700"
            >
              Cadastre o primeiro equipamento
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente / Empreendimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leitura Atual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipamentos.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-semibold text-lg">
                            🚜
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {eq.codigo}
                          </div>
                          <div className="text-sm text-gray-500">
                            {eq.descricao || `${eq.fabricante} ${eq.modelo}`.trim() || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{eq.cliente_nome}</div>
                      <div className="text-sm text-gray-500">{eq.empreendimento_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{eq.tipo_nome}</div>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {eq.tipo_medicao === 'KM' ? 'Quilômetro' : 'Horímetro'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {Number(eq.leitura_atual).toLocaleString('pt-BR')} {eq.tipo_medicao === 'KM' ? 'km' : 'h'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          eq.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {eq.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenQRCode(eq)}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                        title="Ver QR Code"
                      >
                        <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </button>
                      <Link
                        href={`/dashboard/equipamentos/${eq.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        ✏️ Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(eq.id, eq.codigo)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️ Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedEquipamento(null);
        }}
        equipamentoUuid={selectedEquipamento?.uuid || ''}
        equipamentoCodigo={selectedEquipamento?.codigo || ''}
        equipamentoDescricao={selectedEquipamento?.descricao || selectedEquipamento?.modelo}
      />
    </div>
  );
}