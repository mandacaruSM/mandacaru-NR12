'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (data: string) => void;
}

export default function QRCodeScanner({ isOpen, onClose, onScan }: QRCodeScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError(null);
      setResult(null);
      setScanning(true);
      setCameraReady(false);
      scanningRef.current = true;

      // Solicitar acesso a camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Camera traseira no mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Aguardar video estar pronto
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setCameraReady(true);
              scanFrame();
            }).catch(console.error);
          }
        };
      }
    } catch (err: any) {
      console.error('Erro ao acessar camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permissao de camera negada. Por favor, permita o acesso a camera nas configuracoes do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma camera encontrada no dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera em uso por outro aplicativo. Feche outros apps que usam a camera.');
      } else {
        setError(`Erro ao acessar a camera: ${err.message || 'Tente novamente.'}`);
      }
      setScanning(false);
      scanningRef.current = false;
    }
  };

  const stopScanner = () => {
    scanningRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
    setCameraReady(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !scanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Define tamanho do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenha frame do video no canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Pega dados da imagem para analise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Usa jsQR para detectar QR Code (funciona em todos os navegadores)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      console.log('QR Code detectado:', code.data);
      handleScanResult(code.data);
      return;
    }

    // Continua escaneando
    animationRef.current = requestAnimationFrame(scanFrame);
  };

  const handleScanResult = (data: string) => {
    setResult(data);
    setScanning(false);
    stopScanner();

    // Processar resultado do QR Code
    // Suporta formato antigo "eq:{uuid}" e novo formato URL "/dashboard/equipamento/{uuid}"
    const uuidFromEq = data.startsWith('eq:') ? data.replace('eq:', '') : null;
    const uuidFromUrl = (() => {
      const match = data.match(/\/dashboard\/equipamento\/([a-f0-9-]{36})/i);
      return match ? match[1] : null;
    })();
    const uuid = uuidFromEq || uuidFromUrl;

    if (uuid) {
      if (onScan) {
        onScan(data);
      } else {
        onClose();
        window.location.href = `/dashboard/equipamento/${uuid}`;
      }
    } else if (onScan) {
      onScan(data);
    }
  };

  const handleManualInput = () => {
    const code = prompt('Digite o codigo do equipamento:');
    if (code) {
      handleScanResult(`eq:${code}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-90"
        onClick={onClose}
      />

      {/* Scanner */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Escanear QR Code
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

          {/* Camera View */}
          <div className="relative aspect-square bg-black">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <svg className="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-white mb-4">{error}</p>
                <button
                  onClick={startScanner}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tentar novamente
                </button>
              </div>
            ) : result ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-green-600">
                <svg className="w-16 h-16 text-white mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-white text-lg font-semibold mb-2">QR Code detectado!</p>
                <p className="text-white/80 text-sm break-all">{result}</p>
              </div>
            ) : (
              <>
                {/* Loading enquanto camera inicia */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                    <p className="text-white text-sm">Iniciando camera...</p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scan overlay - so mostra quando camera esta pronta */}
                {cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

                      {/* Scanning line animation */}
                      <div className="absolute inset-x-0 h-0.5 bg-green-400 animate-scan" />
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {cameraReady && (
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white text-sm bg-black/50 mx-4 py-2 px-4 rounded-lg">
                      Aponte a camera para o QR Code do equipamento
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-3">
              <button
                onClick={handleManualInput}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Digitar codigo
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for scan animation */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
