// frontend/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('🔐 [API Route] Fazendo login no backend...');

    // Faz requisição ao backend Django
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [API Route] Erro no login:', data);
      return NextResponse.json(
        { error: data.detail || 'Erro ao fazer login' },
        { status: response.status }
      );
    }

    console.log('✅ [API Route] Login bem-sucedido');

    // Extrai tokens do response do Django
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    console.log('🍪 [API Route] Cookies recebidos do Django:', setCookieHeaders.length);

    let accessToken = '';
    let refreshToken = '';

    // Extrai tokens dos cookies do Django
    for (const cookie of setCookieHeaders) {
      if (cookie.startsWith('access=')) {
        const match = cookie.match(/access=([^;]+)/);
        if (match) accessToken = match[1];
      }
      if (cookie.startsWith('refresh=')) {
        const match = cookie.match(/refresh=([^;]+)/);
        if (match) refreshToken = match[1];
      }
    }

    console.log('🔑 [API Route] Access token extraído:', accessToken ? 'SIM' : 'NÃO');
    console.log('🔑 [API Route] Refresh token extraído:', refreshToken ? 'SIM' : 'NÃO');

    // Cria response de sucesso
    const nextResponse = NextResponse.json(data);

    // Define cookies HTTP-only no Next.js para que middleware possa acessar
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    if (accessToken) {
      cookieStore.set('access', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 60 * 60 * 2, // 2 horas
        path: '/',
      });
      console.log('🍪 [API Route] Cookie access definido');
    }

    if (refreshToken) {
      cookieStore.set('refresh', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: '/',
      });
      console.log('🍪 [API Route] Cookie refresh definido');
    }

    return nextResponse;
  } catch (error: any) {
    console.error('❌ [API Route] Erro na requisição:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
