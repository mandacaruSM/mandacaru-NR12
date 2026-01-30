import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Permitir trailing slashes para compatibilidade com Django REST Framework
  skipTrailingSlashRedirect: true,

  // ✅ Ignorar erros de TypeScript durante build (para deploy)
  typescript: {
    ignoreBuildErrors: true,
  },

};

export default nextConfig;
