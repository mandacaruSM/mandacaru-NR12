'use client';

import { useRef, useState, useEffect } from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamentoUuid: string;
  equipamentoCodigo: string;
  equipamentoDescricao?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  equipamentoUuid,
  equipamentoCodigo,
  equipamentoDescricao
}: QRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset states when modal opens/closes or UUID changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [isOpen, equipamentoUuid]);

  if (!isOpen) return null;

  // URL do QR Code gerado dinamicamente via proxy
  // Endpoint: /api/v1/equipamentos/equipamentos/<uuid>/qr.png
  const fullQrCodeUrl = equipamentoUuid
    ? `/api/proxy/equipamentos/equipamentos/${equipamentoUuid}/qr.png`
    : null;

  const handleDownload = async () => {
    if (!fullQrCodeUrl) return;

    try {
      const response = await fetch(fullQrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode_${equipamentoCodigo}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar QR Code:', error);
      // Fallback: abre em nova aba
      window.open(fullQrCodeUrl, '_blank');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o QR Code');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${equipamentoCodigo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #333;
              padding: 20px;
              border-radius: 8px;
            }
            .qr-image {
              max-width: 300px;
              height: auto;
            }
            .qr-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            .qr-subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 15px;
            }
            .qr-code-text {
              font-size: 16px;
              font-weight: bold;
              margin-top: 15px;
              color: #333;
            }
            @media print {
              body {
                min-height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-title">MANDACARU NR12</div>
            <div class="qr-subtitle">Sistema de Gestao de Equipamentos</div>
            <img src="${fullQrCodeUrl}" alt="QR Code" class="qr-image" />
            <div class="qr-code-text">${equipamentoCodigo}</div>
            ${equipamentoDescricao ? `<div class="qr-subtitle">${equipamentoDescricao}</div>` : ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              QR Code - {equipamentoCodigo}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* QR Code Image */}
          <div ref={printRef} className="flex flex-col items-center py-6 bg-gray-50 rounded-lg mb-4">
            {fullQrCodeUrl && !imageError ? (
              <>
                {!imageLoaded && (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}
                <img
                  src={fullQrCodeUrl}
                  alt={`QR Code do equipamento ${equipamentoCodigo}`}
                  className={`w-64 h-64 object-contain ${imageLoaded ? '' : 'hidden'}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(false);
                  }}
                />
                {imageLoaded && (
                  <>
                    <p className="mt-3 text-sm font-medium text-gray-700">{equipamentoCodigo}</p>
                    {equipamentoDescricao && (
                      <p className="text-xs text-gray-500">{equipamentoDescricao}</p>
                    )}
                  </>
                )}
              </>
            ) : imageError ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-16 h-16 mx-auto mb-2 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-500">Erro ao carregar QR Code</p>
                <p className="text-xs mt-1 text-gray-400">URL: {fullQrCodeUrl}</p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-16 h-16 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p>QR Code nao disponivel</p>
                <p className="text-xs mt-1">O QR Code sera gerado automaticamente</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={!fullQrCodeUrl}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Baixar
            </button>
            <button
              onClick={handlePrint}
              disabled={!fullQrCodeUrl}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
