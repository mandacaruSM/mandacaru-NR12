// frontend/src/app/dashboard/operadores/novo/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormularioOperador from '@/components/formularios/FormularioOperador';
import api, { Cliente, Operador } from '@/lib/api';

export default function NovoOperadorPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      const { data } = await api.clientes.list();
      setClientes(data.results || []);
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar clientes');
    } finally {
      setCarregando(false);
    }
  };

  const handleSucesso = (operador: Operador) => {
    router.push(`/dashboard/operadores/${operador.id}`);
  };

  if (carregando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/operadores" className="hover:text-blue-600">
            Operadores
          </Link>
          <span>/</span>
          <span>Novo Operador</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Operador</h1>
      </div>

      {/* Erro */}
      {erro && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded mb-6">
          <p className="text-red-800">{erro}</p>
        </div>
      )}

      {/* Formulário */}
      {!erro && (
        <FormularioOperador
          clientes={clientes}
          onSucesso={handleSucesso}
          onErro={setErro}
        />
      )}
    </div>
  );
}