'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import TelegramVinculacao from '@/components/TelegramVinculacao';

interface Tecnico {
  id: number;
  nome: string;
  nome_completo?: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  foto?: string;
  email?: string;
  telefone?: string;
  telefone_emergencia?: string;
  telegram_chat_id?: string;
  telegram_username?: string;
  telegram_vinculado_em?: string;
  codigo_vinculacao?: string;
  codigo_valido_ate?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  especialidade?: string;
  nivel_experiencia?: string;
  numero_cnh?: string;
  categoria_cnh?: string;
  validade_cnh?: string;
  certificacoes?: string;
  cursos_treinamentos?: string;
  observacoes?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function TecnicoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [item, setItem] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErro(null);
      const data = await api<Tecnico>(`/tecnicos/${id}/`);
      setItem(data);
    } catch (e: any) {
      console.error('Erro ao carregar técnico:', e);
      setErro(e.message || 'Erro ao carregar técnico');
    } finally {
      setLoading(false);
    }
  };

  const onRemove = async () => {
    if (!confirm('Excluir este técnico?')) return;
    try {
      await api(`/tecnicos/${id}/`, { method: 'DELETE' });
      router.push('/dashboard/tecnicos');
    } catch (e: any) {
      alert(e.message || 'Falha ao remover');
    }
  };

  const handleGerarCodigo = async () => {
    try {
      await api(`/tecnicos/${id}/gerar_codigo_telegram/`, { method: 'POST' });
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao gerar código');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando...</span>
      </div>
    );
  }

  if (erro || !item) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">{erro || 'Técnico não encontrado'}</p>
        </div>
        <Link
          href="/dashboard/tecnicos"
          className="inline-block px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Técnico 👨‍🔧</h1>
          <p className="text-gray-600 mt-1">{item.nome}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/tecnicos/${id}/editar`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Editar
          </Link>
          <button
            onClick={onRemove}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Dados Pessoais */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Nome</p>
            <p className="text-gray-700">{item.nome}</p>
          </div>
          {item.nome_completo && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Nome Completo</p>
              <p className="text-gray-700">{item.nome_completo}</p>
            </div>
          )}
          {item.cpf && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">CPF</p>
              <p className="text-gray-700">{item.cpf}</p>
            </div>
          )}
          {item.rg && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">RG</p>
              <p className="text-gray-700">{item.rg}</p>
            </div>
          )}
          {item.data_nascimento && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Data de Nascimento</p>
              <p className="text-gray-700">{new Date(item.data_nascimento).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Status</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {item.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Contato e Telegram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Contato */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Email</p>
                <p className="text-gray-700">{item.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Telefone</p>
                <p className="text-gray-700">{item.telefone || '-'}</p>
              </div>
              {item.telefone_emergencia && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Telefone de Emergência</p>
                  <p className="text-gray-700">{item.telefone_emergencia}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna 3: Telegram */}
        <div className="lg:col-span-1">
          <TelegramVinculacao
            codigoVinculacao={item.codigo_vinculacao}
            codigoValidoAte={item.codigo_valido_ate}
            telegramChatId={item.telegram_chat_id}
            telegramUsername={item.telegram_username}
            telegramVinculadoEm={item.telegram_vinculado_em}
            onGerarNovoCodigo={handleGerarCodigo}
            showGerarButton={true}
          />
        </div>
      </div>

      {/* Endereço */}
      {(item.logradouro || item.cidade) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {item.logradouro && (
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-900 mb-1">Logradouro</p>
                <p className="text-gray-700">{item.logradouro}{item.numero && `, ${item.numero}`}{item.complemento && ` - ${item.complemento}`}</p>
              </div>
            )}
            {item.bairro && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Bairro</p>
                <p className="text-gray-700">{item.bairro}</p>
              </div>
            )}
            {item.cidade && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Cidade/UF</p>
                <p className="text-gray-700">{item.cidade}{item.uf && ` - ${item.uf}`}</p>
              </div>
            )}
            {item.cep && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">CEP</p>
                <p className="text-gray-700">{item.cep}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Qualificações */}
      {(item.especialidade || item.nivel_experiencia) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualificações</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {item.especialidade && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Especialidade</p>
                <p className="text-gray-700">{item.especialidade}</p>
              </div>
            )}
            {item.nivel_experiencia && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Nível de Experiência</p>
                <p className="text-gray-700 capitalize">{item.nivel_experiencia}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CNH */}
      {(item.numero_cnh || item.categoria_cnh) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CNH</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {item.numero_cnh && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Número</p>
                <p className="text-gray-700">{item.numero_cnh}</p>
              </div>
            )}
            {item.categoria_cnh && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Categoria</p>
                <p className="text-gray-700">{item.categoria_cnh}</p>
              </div>
            )}
            {item.validade_cnh && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Validade</p>
                <p className="text-gray-700">{new Date(item.validade_cnh).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certificações e Cursos */}
      {(item.certificacoes || item.cursos_treinamentos || item.observacoes) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificações e Observações</h3>
          <div className="space-y-6">
            {item.certificacoes && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Certificações</p>
                <p className="text-gray-700 whitespace-pre-wrap">{item.certificacoes}</p>
              </div>
            )}
            {item.cursos_treinamentos && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Cursos e Treinamentos</p>
                <p className="text-gray-700 whitespace-pre-wrap">{item.cursos_treinamentos}</p>
              </div>
            )}
            {item.observacoes && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Observações</p>
                <p className="text-gray-700 whitespace-pre-wrap">{item.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informações do Sistema */}
      {(item.created_at || item.updated_at) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {item.created_at && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Data de Cadastro</p>
                <p className="text-gray-700">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
              </div>
            )}
            {item.updated_at && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Última Atualização</p>
                <p className="text-gray-700">{new Date(item.updated_at).toLocaleString('pt-BR')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Link
        href="/dashboard/tecnicos"
        className="inline-block px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
      >
        Voltar para Lista
      </Link>
    </div>
  );
}
