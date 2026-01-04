import React from 'react';

interface RelatorioPrintLayoutProps {
  titulo: string;
  subtitulo?: string;
  periodo?: {
    dataInicio?: string;
    dataFim?: string;
  };
  children: React.ReactNode;
}

export default function RelatorioPrintLayout({
  titulo,
  subtitulo,
  periodo,
  children,
}: RelatorioPrintLayoutProps) {
  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-layout">
      {/* Cabeçalho - visível apenas na impressão */}
      <div className="print-header">
        <div className="header-content">
          <div className="header-left">
            <img
              src="/logo.png"
              alt="Logo da Empresa"
              className="company-logo"
            />
          </div>
          <div className="header-right">
            <h1 className="report-title">{titulo}</h1>
            {subtitulo && <p className="report-subtitle">{subtitulo}</p>}
            {periodo && (periodo.dataInicio || periodo.dataFim) && (
              <p className="report-period">
                Período:{' '}
                {periodo.dataInicio
                  ? new Date(periodo.dataInicio).toLocaleDateString('pt-BR')
                  : '...'}{' '}
                até{' '}
                {periodo.dataFim
                  ? new Date(periodo.dataFim).toLocaleDateString('pt-BR')
                  : '...'}
              </p>
            )}
          </div>
        </div>
        <div className="header-divider" />
      </div>

      {/* Conteúdo do relatório */}
      <div className="print-content">{children}</div>

      {/* Rodapé - visível apenas na impressão */}
      <div className="print-footer">
        <div className="footer-divider" />
        <div className="footer-content">
          <div className="footer-left">
            <p>Gerado em: {dataAtual}</p>
          </div>
          <div className="footer-right">
            <p className="page-number">Página <span className="page-num"></span></p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .print-layout {
          position: relative;
        }

        /* Estilos para impressão */
        .print-header,
        .print-footer {
          display: none;
        }

        @media print {
          /* Reset de margens e cores */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }

          @page {
            margin: 2cm;
            size: A4 landscape;
          }

          /* Mostrar cabeçalho na impressão */
          .print-header {
            display: block;
            margin-bottom: 20px;
          }

          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 15px;
          }

          .company-logo {
            width: 200px;
            height: auto;
            max-height: 80px;
            object-fit: contain;
          }

          .header-right {
            text-align: right;
            flex: 1;
            margin-left: 20px;
          }

          .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
            margin-bottom: 5px;
          }

          .report-subtitle {
            font-size: 14px;
            color: #4b5563;
            margin: 0;
            margin-bottom: 3px;
          }

          .report-period {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
          }

          .header-divider {
            height: 3px;
            background: linear-gradient(to right, #2563eb, #3b82f6);
            border-radius: 2px;
          }

          /* Conteúdo */
          .print-content {
            page-break-inside: avoid;
          }

          /* Mostrar rodapé na impressão */
          .print-footer {
            display: block;
            margin-top: 30px;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 0 2cm;
          }

          .footer-divider {
            height: 2px;
            background: #e5e7eb;
            margin-bottom: 10px;
          }

          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #6b7280;
          }

          .footer-left p,
          .footer-right p {
            margin: 0;
          }

          /* Numeração de páginas */
          .page-num::after {
            content: counter(page);
          }

          /* Evitar quebras de página indesejadas */
          table,
          .card,
          .section {
            page-break-inside: avoid;
          }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            page-break-after: avoid;
          }

          /* Esconder elementos não essenciais */
          .no-print {
            display: none !important;
          }

          /* Ajustar tabelas para impressão */
          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }

          th {
            background-color: #f3f4f6 !important;
            font-weight: 600;
          }

          /* Cards de estatísticas */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
          }

          .stat-card {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
