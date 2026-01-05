'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { financeiroApi } from '@/lib/api';

export default function FinanceiroPage() {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    contas_receber: {
      total: 0,
      abertas: 0,
      vencidas: 0,
      pagas: 0,
      total_aberto: 0,
      total_vencido: 0,
      total_recebido: 0,
    },
    contas_pagar: {
      total: 0,
      abertas: 0,
      vencidas: 0,
      pagas: 0,
      total_aberto: 0,
      total_vencido: 0,
      total_pago: 0,
    },
  });

  useEffect(() => {
    loadResumo();
  }, []);

  async function loadResumo() {
    try {
      setLoading(true);
      const [contasReceberData, contasPagarData] = await Promise.all([
        financeiroApi.contasReceber.resumo(),
        financeiroApi.contasPagar.resumo(),
      ]);

      setResumo({
        contas_receber: contasReceberData,
        contas_pagar: contasPagarData,
      });
    } catch (error) {
      console.error('Erro ao carregar resumo financeiro:', error);
    } finally {
      setLoading(false);
    }
  }

  const saldoGeral = resumo.contas_receber.total_aberto - resumo.contas_pagar.total_aberto;

  const modules = [
    {
      title: 'Contas a Receber',
      description: 'Gerenciar contas a receber de clientes',
      href: '/dashboard/financeiro/contas-receber',
      icon: '💰',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Contas a Pagar',
      description: 'Gerenciar contas a pagar de fornecedores',
      href: '/dashboard/financeiro/contas-pagar',
      icon: '💸',
      color: 'from-red-500 to-red-600',
    },
    {
      title: 'Fluxo de Caixa',
      description: 'Visualizar e gerenciar fluxo de caixa',
      href: '/dashboard/financeiro/fluxo-caixa',
      icon: '📊',
      color: 'from-blue-500 to-blue-600',
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-900">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-900 mt-1">Gestão financeira do sistema</p>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Contas a Receber */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">A Receber (Abertas)</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            R$ {resumo.contas_receber.total_aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-900 mt-1">
            {resumo.contas_receber.abertas} conta(s) aberta(s)
          </p>
        </div>

        {/* Contas Vencidas (a Receber) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Vencidas (Receber)</h3>
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            R$ {resumo.contas_receber.total_vencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-900 mt-1">
            {resumo.contas_receber.vencidas} conta(s) vencida(s)
          </p>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">A Pagar (Abertas)</h3>
            <span className="text-2xl">💸</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            R$ {resumo.contas_pagar.total_aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-900 mt-1">
            {resumo.contas_pagar.abertas} conta(s) aberta(s)
          </p>
        </div>

        {/* Saldo Geral */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Saldo Geral</h3>
            <span className="text-2xl">📊</span>
          </div>
          <p className={`text-2xl font-bold ${saldoGeral >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {Math.abs(saldoGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-900 mt-1">
            {saldoGeral >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
          </p>
        </div>
      </div>

      {/* Cards Detalhados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Resumo Contas a Receber */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contas a Receber</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Total de Contas:</span>
              <span className="font-medium text-gray-900">{resumo.contas_receber.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Abertas:</span>
              <span className="font-medium text-blue-600">{resumo.contas_receber.abertas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Vencidas:</span>
              <span className="font-medium text-red-600">{resumo.contas_receber.vencidas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Pagas:</span>
              <span className="font-medium text-green-600">{resumo.contas_receber.pagas}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-sm font-medium text-gray-900">Total Recebido:</span>
              <span className="font-bold text-green-600">
                R$ {resumo.contas_receber.total_recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Resumo Contas a Pagar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contas a Pagar</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Total de Contas:</span>
              <span className="font-medium text-gray-900">{resumo.contas_pagar.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Abertas:</span>
              <span className="font-medium text-blue-600">{resumo.contas_pagar.abertas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Vencidas:</span>
              <span className="font-medium text-red-600">{resumo.contas_pagar.vencidas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-900">Pagas:</span>
              <span className="font-medium text-green-600">{resumo.contas_pagar.pagas}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-sm font-medium text-gray-900">Total Pago:</span>
              <span className="font-bold text-orange-600">
                R$ {resumo.contas_pagar.total_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">Módulos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center text-3xl shadow-md mb-4`}>
                {module.icon}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {module.title}
              </h2>
              <p className="text-gray-900 text-sm">
                {module.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
