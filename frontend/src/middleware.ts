// frontend/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Com localStorage, middleware não pode verificar autenticação (Edge Runtime não tem acesso)
  // Proteção de rotas é feita client-side pelo AuthContext
  // Middleware agora apenas permite tráfego livre
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - _next/webpack-hmr (hot reload)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)',
  ],
};