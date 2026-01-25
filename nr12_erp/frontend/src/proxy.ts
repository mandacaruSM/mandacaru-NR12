// frontend/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // ✅ Ignorar requisições de prefetch do Next.js
  // Prefetch não deve disparar lógica de autenticação ou redirecionamentos
  const isPrefetch =
    request.headers.get('x-middleware-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch';

  if (isPrefetch) {
    console.log('⏭️  Middleware: Ignorando prefetch');
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access')?.value;
  const { pathname } = request.nextUrl;

  console.log(`🛣️  Middleware: ${pathname} | Token: ${accessToken ? '✅' : '❌'}`);

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/', '/register'];

  // Previne loops de redirecionamento
  const isPublicPath = publicPaths.includes(pathname);
  const isDashboardPath = pathname.startsWith('/dashboard');
  const isLoginPath = pathname === '/login';

  // Se está tentando acessar rota pública
  if (isPublicPath) {
    // Se já está autenticado e tenta acessar /login, redireciona para dashboard
    if (accessToken && isLoginPath) {
      console.log('🔀 Redirecionando /login → /dashboard (já autenticado)');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Se está tentando acessar rota protegida sem token, redireciona para login
  if (!accessToken && isDashboardPath) {
    console.log('🔒 Redirecionando /dashboard → /login (não autenticado)');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se tem token mas está acessando raiz, redireciona para dashboard
  if (accessToken && pathname === '/') {
    console.log('🔀 Redirecionando / → /dashboard (autenticado)');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

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