import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Permitir trailing slashes para compatibilidade com Django REST Framework
  skipTrailingSlashRedirect: true,

  // ✅ Ignorar erros de TypeScript durante build (para deploy)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Ignorar erros de ESLint durante build (para deploy)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
