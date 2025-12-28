'use client';

import Link from 'next/link';

export default function RelatoriosPage() {
  const reportCategories = [
    {
      title: 'Operacional',
      description: 'Relatórios de operações e execução',
      icon: '⚙️',
      color: 'from-blue-500 to-blue-600',
      reports: [
        {
          name: 'Manutenções Realizadas',
          href: '/dashboard/relatorios/manutencoes',
          description: 'Histórico e análise de manutenções',
        },
        {
          name: 'Abastecimentos',
          href: '/dashboard/relatorios/abastecimentos',
          description: 'Consumo de combustível por equipamento',
        },
        {
          name: 'Ordens de Serviço',
          href: '/dashboard/relatorios/ordens-servico',
          description: 'Status e histórico de OS',
        },
        {
          name: 'NR12 - Checklists',
          href: '/dashboard/nr12/relatorios',
          description: 'Relatórios de conformidade NR12',
        },
      ],
    },
    {
      title: 'Financeiro',
      description: 'Análises financeiras e faturamento',
      icon: '💰',
      color: 'from-green-500 to-green-600',
      reports: [
        {
          name: 'Contas a Receber',
          href: '/dashboard/relatorios/contas-receber',
          description: 'Análise de recebimentos e inadimplência',
        },
        {
          name: 'Contas a Pagar',
          href: '/dashboard/relatorios/contas-pagar',
          description: 'Análise de pagamentos e despesas',
        },
        {
          name: 'Fluxo de Caixa',
          href: '/dashboard/relatorios/fluxo-caixa',
          description: 'Entradas e saídas do período',
        },
        {
          name: 'Faturamento',
          href: '/dashboard/relatorios/faturamento',
          description: 'Análise de faturamento por período',
        },
      ],
    },
    {
      title: 'Estoque',
      description: 'Controle e movimentação de estoque',
      icon: '📦',
      color: 'from-purple-500 to-purple-600',
      reports: [
        {
          name: 'Posição de Estoque',
          href: '/dashboard/relatorios/estoque',
          description: 'Produtos em estoque e valores',
        },
        {
          name: 'Movimentação de Estoque',
          href: '/dashboard/relatorios/movimentacao-estoque',
          description: 'Entradas e saídas de produtos',
        },
        {
          name: 'Produtos em Falta',
          href: '/dashboard/relatorios/produtos-falta',
          description: 'Produtos abaixo do estoque mínimo',
        },
      ],
    },
    {
      title: 'Equipamentos',
      description: 'Análise de equipamentos e utilização',
      icon: '🚜',
      color: 'from-orange-500 to-orange-600',
      reports: [
        {
          name: 'Por Empreendimento',
          href: '/dashboard/relatorios/empreendimentos',
          description: 'Horas, abastecimento e manutenção por empreendimento',
        },
        {
          name: 'Equipamentos por Cliente',
          href: '/dashboard/relatorios/equipamentos-cliente',
          description: 'Equipamentos distribuídos por cliente',
        },
        {
          name: 'Histórico de Manutenção',
          href: '/dashboard/relatorios/historico-manutencao',
          description: 'Histórico completo por equipamento',
        },
        {
          name: 'Desempenho de Equipamentos',
          href: '/dashboard/relatorios/desempenho-equipamentos',
          description: 'Análise de disponibilidade e custos',
        },
      ],
    },
    {
      title: 'Clientes',
      description: 'Análise de clientes e contratos',
      icon: '👥',
      color: 'from-indigo-500 to-indigo-600',
      reports: [
        {
          name: 'Faturamento por Cliente',
          href: '/dashboard/relatorios/faturamento-cliente',
          description: 'Receita gerada por cliente',
        },
        {
          name: 'Serviços por Cliente',
          href: '/dashboard/relatorios/servicos-cliente',
          description: 'Histórico de serviços prestados',
        },
        {
          name: 'Inadimplência',
          href: '/dashboard/relatorios/inadimplencia',
          description: 'Análise de contas em atraso',
        },
      ],
    },
    {
      title: 'Gerencial',
      description: 'Indicadores e análises gerenciais',
      icon: '📊',
      color: 'from-red-500 to-red-600',
      reports: [
        {
          name: 'Dashboard Executivo',
          href: '/dashboard/relatorios/dashboard-executivo',
          description: 'Principais indicadores consolidados',
        },
        {
          name: 'Produtividade',
          href: '/dashboard/relatorios/produtividade',
          description: 'Análise de produtividade da equipe',
        },
        {
          name: 'Análise de Custos',
          href: '/dashboard/relatorios/analise-custos',
          description: 'Custos operacionais detalhados',
        },
      ],
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-900 mt-1">
          Análises e relatórios do sistema
        </p>
      </div>

      <div className="space-y-6">
        {reportCategories.map((category) => (
          <div key={category.title} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header da Categoria */}
            <div className={`bg-gradient-to-r ${category.color} p-4`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-2xl">
                  {category.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{category.title}</h2>
                  <p className="text-white text-opacity-90 text-sm">{category.description}</p>
                </div>
              </div>
            </div>

            {/* Lista de Relatórios */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report) => (
                  <Link
                    key={report.href}
                    href={report.href}
                    className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {report.name}
                      </h3>
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-900">{report.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
