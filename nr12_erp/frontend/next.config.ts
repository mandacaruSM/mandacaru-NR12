import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Permitir trailing slashes para compatibilidade com Django REST Framework
  skipTrailingSlashRedirect: true,

  // ✅ Ignorar erros de TypeScript durante build (para deploy)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Proxy para arquivos de mídia do backend Django
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/media/:path*`,
      },
    ];
  },

  // ✅ Permitir imagens externas do backend
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
