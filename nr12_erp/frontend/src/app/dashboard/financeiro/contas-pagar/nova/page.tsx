'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { financeiroApi } from '@/lib/api';

interface Fornecedor {
  id: number;
  nome: string;
  cpf_cnpj?: string;
  tipo_pessoa: 'F' | 'J';
}

export default function NovaContaPagarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);

  const [formData, setFormData] = useState({
    tipo: 'FORNECEDOR' as 'FORNECEDOR' | 'SALARIO' | 'IMPOSTO' | 'ALUGUEL' | 'SERVICO' | 'OUTROS',
    fornecedor: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    valor_original: '',
    valor_juros: '0',
    valor_desconto: '0',
    descricao: '',
    observacoes: '',
    numero_documento: '',
  });

  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: '',
    cpf_cnpj: '',
    tipo_pessoa: 'J' as 'F' | 'J',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
  });

  useEffect(() => {
    loadFornecedores();
  }, []);

  async function loadFornecedores() {
    try {
      const response = await fetch('/api/proxy/clientes/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFornecedores(data.results || []);
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const dados = {
        tipo: formData.tipo,
        fornecedor: formData.fornecedor,
        data_emissao: formData.data_emissao,
        data_vencimento: formData.data_vencimento,
        valor_original: parseFloat(formData.valor_original),
        valor_juros: parseFloat(formData.valor_juros || '0'),
        valor_desconto: parseFloat(formData.valor_desconto || '0'),
        valor_pago: 0,
        status: 'ABERTA' as 'ABERTA',
        descricao: formData.descricao,
        observacoes: formData.observacoes,
        numero_documento: formData.numero_documento,
      };

      await financeiroApi.contasPagar.create(dados);
      alert('Conta a pagar criada com sucesso!');
      router.push('/dashboard/financeiro/contas-pagar');
    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      alert('Erro ao criar conta a pagar');
    } finally {
      setLoading(false);
    }
  }

  async function handleCriarFornecedor(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/proxy/clientes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(novoFornecedor),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar fornecedor');
      }

      const fornecedorCriado = await response.json();

      // Atualizar lista de fornecedores
      await loadFornecedores();

      // Selecionar o fornecedor recém-criado
      setFormData({ ...formData, fornecedor: fornecedorCriado.nome });

      // Fechar modal
      setShowFornecedorModal(false);

      // Limpar formulário do modal
      setNovoFornecedor({
        nome: '',
        cpf_cnpj: '',
        tipo_pessoa: 'J',
        telefone: '',
        email: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
      });

      alert('Fornecedor criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      alert('Erro ao criar fornecedor');
    } finally {
      setLoading(false);
    }
  }

  const valorFinal = (
    parseFloat(formData.valor_original || '0') +
    parseFloat(formData.valor_juros || '0') -
    parseFloat(formData.valor_desconto || '0')
  ).toFixed(2);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova Conta a Pagar</h1>
        <p className="text-gray-900 mt-1">Registre uma nova conta a pagar</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-6">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Tipo <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              required
            >
              <option value="FORNECEDOR">Fornecedor</option>
              <option value="SALARIO">Salário</option>
              <option value="IMPOSTO">Imposto</option>
              <option value="ALUGUEL">Aluguel</option>
              <option value="SERVICO">Serviço</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

          {/* Fornecedor */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Fornecedor <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.fornecedor}
                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                list="fornecedores-list"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
                placeholder="Digite ou selecione o fornecedor"
                required
              />
              <datalist id="fornecedores-list">
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.nome}>
                    {f.cpf_cnpj && `(${f.cpf_cnpj})`}
                  </option>
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => setShowFornecedorModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
              >
                + Novo
              </button>
            </div>
          </div>

          {/* Data de Emissão */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data de Emissão
            </label>
            <input
              type="date"
              value={formData.data_emissao}
              onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
            />
          </div>

          {/* Data de Vencimento */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data de Vencimento <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={formData.data_vencimento}
              onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              required
            />
          </div>

          {/* Número do Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Número do Documento
            </label>
            <input
              type="text"
              value={formData.numero_documento}
              onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              placeholder="Ex: NF-1234"
            />
          </div>

          {/* Valor Original */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Valor Original <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_original}
              onChange={(e) => setFormData({ ...formData, valor_original: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              placeholder="0.00"
              required
            />
          </div>

          {/* Valor de Juros */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Valor de Juros
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_juros}
              onChange={(e) => setFormData({ ...formData, valor_juros: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              placeholder="0.00"
            />
          </div>

          {/* Valor de Desconto */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Valor de Desconto
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_desconto}
              onChange={(e) => setFormData({ ...formData, valor_desconto: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              placeholder="0.00"
            />
          </div>

          {/* Valor Final (calculado) */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Valor Final
            </label>
            <div className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-gray-900 font-bold">
              R$ {valorFinal}
            </div>
          </div>

          {/* Descrição */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              placeholder="Descrição da conta"
            />
          </div>

          {/* Observações */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              rows={3}
              placeholder="Observações adicionais"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-900 px-6 py-2 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Conta'}
          </button>
        </div>
      </form>

      {/* Modal de Novo Fornecedor */}
      {showFornecedorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Novo Fornecedor</h2>

            <form onSubmit={handleCriarFornecedor}>
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de Pessoa */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Tipo <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={novoFornecedor.tipo_pessoa}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, tipo_pessoa: e.target.value as 'F' | 'J' })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    required
                  >
                    <option value="F">Pessoa Física</option>
                    <option value="J">Pessoa Jurídica</option>
                  </select>
                </div>

                {/* CPF/CNPJ */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    {novoFornecedor.tipo_pessoa === 'F' ? 'CPF' : 'CNPJ'}
                  </label>
                  <input
                    type="text"
                    value={novoFornecedor.cpf_cnpj}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, cpf_cnpj: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder={novoFornecedor.tipo_pessoa === 'F' ? '000.000.000-00' : '00.000.000/0000-00'}
                  />
                </div>

                {/* Nome */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Nome/Razão Social <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={novoFornecedor.nome}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    required
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={novoFornecedor.telefone}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, telefone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={novoFornecedor.email}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, email: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                {/* Endereço */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={novoFornecedor.endereco}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, endereco: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={novoFornecedor.cidade}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, cidade: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={novoFornecedor.estado}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, estado: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>

                {/* CEP */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={novoFornecedor.cep}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, cep: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFornecedorModal(false)}
                  className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Criar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
