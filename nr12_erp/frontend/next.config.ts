import type { NextConfig } from "next";

// Config base do Next.js
const nextConfig: NextConfig = {
  // ✅ CRÍTICO: Permitir trailing slashes para compatibilidade com Django REST Framework
  // Django DRF com APPEND_SLASH=True EXIGE trailing slash em todas as URLs
  skipTrailingSlashRedirect: true,

  // Configuração vazia do Turbopack para silenciar warning do Next.js 16
  turbopack: {},
};

// Exporta configuração
// NOTA: PWA temporariamente desabilitado devido incompatibilidade com Next.js 16
// Será reativado quando houver versão compatível do next-pwa
export default nextConfig;
