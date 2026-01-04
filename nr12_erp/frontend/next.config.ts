import type { NextConfig } from "next";

// Config mínima - deixar Next.js usar defaults
const nextConfig: NextConfig = {
  // ✅ CRÍTICO: Permitir trailing slashes para compatibilidade com Django REST Framework
  // Django DRF com APPEND_SLASH=True EXIGE trailing slash em todas as URLs
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
