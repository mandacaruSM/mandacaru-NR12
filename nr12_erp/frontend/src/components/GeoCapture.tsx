// frontend/src/components/GeoCapture.tsx
'use client';

import { useState, useCallback } from 'react';
import { geolocalizacaoApi, GeocodificacaoResult } from '@/lib/api';

interface GeoCaptureProps {
  onCapture: (data: {
    latitude: number;
    longitude: number;
    precisao_gps: number;
    endereco?: GeocodificacaoResult;
  }) => void;
  initialLatitude?: number | string | null;
  initialLongitude?: number | string | null;
  showGeocoding?: boolean;
  disabled?: boolean;
}

type GeoStatus = 'idle' | 'loading' | 'geocoding' | 'success' | 'error' | 'denied';

export default function GeoCapture({
  onCapture,
  initialLatitude,
  initialLongitude,
  showGeocoding = true,
  disabled = false,
}: GeoCaptureProps) {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [geoData, setGeoData] = useState<{
    latitude: number | null;
    longitude: number | null;
    precisao_gps: number | null;
  }>({
    latitude: initialLatitude ? Number(initialLatitude) : null,
    longitude: initialLongitude ? Number(initialLongitude) : null,
    precisao_gps: null,
  });
  const [endereco, setEndereco] = useState<GeocodificacaoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureGeolocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Geolocalização não suportada pelo navegador');
      return;
    }

    setStatus('loading');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setGeoData({
          latitude,
          longitude,
          precisao_gps: accuracy,
        });

        // Tentar geocodificar o endereço
        if (showGeocoding) {
          setStatus('geocoding');
          try {
            const geocodeResult = await geolocalizacaoApi.geocodificar(latitude, longitude);
            setEndereco(geocodeResult);

            onCapture({
              latitude,
              longitude,
              precisao_gps: accuracy,
              endereco: geocodeResult,
            });
          } catch (err) {
            console.warn('Erro na geocodificação:', err);
            // Mesmo sem geocodificação, envia os dados de GPS
            onCapture({
              latitude,
              longitude,
              precisao_gps: accuracy,
            });
          }
        } else {
          onCapture({
            latitude,
            longitude,
            precisao_gps: accuracy,
          });
        }

        setStatus('success');
      },
      (error) => {
        console.warn('Erro ao capturar GPS:', error.message);
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Permissão de localização negada. Habilite nas configurações do navegador.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setStatus('error');
          setError('Localização indisponível. Verifique se o GPS está ativo.');
        } else if (error.code === error.TIMEOUT) {
          setStatus('error');
          setError('Tempo esgotado ao obter localização. Tente novamente.');
        } else {
          setStatus('error');
          setError(`Erro ao capturar localização: ${error.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, [onCapture, showGeocoding]);

  const openInMaps = () => {
    if (geoData.latitude && geoData.longitude) {
      window.open(
        `https://www.google.com/maps?q=${geoData.latitude},${geoData.longitude}`,
        '_blank'
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Botão de captura */}
      <button
        type="button"
        onClick={captureGeolocation}
        disabled={disabled || status === 'loading' || status === 'geocoding'}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
          status === 'success'
            ? 'bg-green-100 text-green-800 border border-green-300'
            : status === 'error' || status === 'denied'
            ? 'bg-red-100 text-red-800 border border-red-300'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {status === 'loading' && (
          <>
            <span className="animate-pulse">📍</span>
            Capturando localização...
          </>
        )}
        {status === 'geocoding' && (
          <>
            <span className="animate-spin">🔄</span>
            Obtendo endereço...
          </>
        )}
        {status === 'success' && (
          <>
            <span>✓</span>
            GPS capturado (precisão: {geoData.precisao_gps?.toFixed(0)}m)
          </>
        )}
        {status === 'error' && (
          <>
            <span>⚠</span>
            Tentar novamente
          </>
        )}
        {status === 'denied' && (
          <>
            <span>🔒</span>
            GPS negado - Tentar novamente
          </>
        )}
        {status === 'idle' && (
          <>
            <span>📍</span>
            Capturar Localização Atual via GPS
          </>
        )}
      </button>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Coordenadas capturadas */}
      {geoData.latitude && geoData.longitude && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Coordenadas</span>
            <button
              type="button"
              onClick={openInMaps}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              Ver no Maps
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Latitude:</span>
              <span className="ml-1 text-gray-900 font-mono">{geoData.latitude.toFixed(7)}</span>
            </div>
            <div>
              <span className="text-gray-500">Longitude:</span>
              <span className="ml-1 text-gray-900 font-mono">{geoData.longitude.toFixed(7)}</span>
            </div>
          </div>
          {geoData.precisao_gps && (
            <div className="text-xs text-gray-500">
              Precisão: ±{geoData.precisao_gps.toFixed(0)} metros
            </div>
          )}
        </div>
      )}

      {/* Endereço geocodificado */}
      {endereco && endereco.endereco_completo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm font-medium text-blue-700">Endereço detectado:</span>
          <p className="text-sm text-blue-900 mt-1">{endereco.endereco_completo}</p>
        </div>
      )}
    </div>
  );
}
