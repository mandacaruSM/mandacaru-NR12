'use client';

import Link from 'next/link';

export default function FinanceiroPage() {
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-900 mt-1">Gestão financeira do sistema</p>
      </div>

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
