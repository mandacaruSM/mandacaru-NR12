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

    // Extrai cookies do Django do header Set-Cookie
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    console.log('🍪 [API Route] Cookies recebidos do Django:', setCookieHeaders.length);

    // Procura pelo sessionid nos cookies do Django
    let sessionId = '';
    let csrfToken = '';

    for (const cookie of setCookieHeaders) {
      if (cookie.startsWith('sessionid=')) {
        // Extrai o valor do sessionid
        const match = cookie.match(/sessionid=([^;]+)/);
        if (match) sessionId = match[1];
      }
      if (cookie.startsWith('csrftoken=')) {
        // Extrai o valor do csrftoken
        const match = cookie.match(/csrftoken=([^;]+)/);
        if (match) csrfToken = match[1];
      }
    }

    console.log('🍪 [API Route] SessionID extraído:', sessionId ? 'SIM' : 'NÃO');

    // Cria response de sucesso
    const nextResponse = NextResponse.json(data);

    // Define cookies que o middleware e futuras requisições podem usar
    const cookieStore = await cookies();

    // Cookie "access" para o middleware
    cookieStore.set('access', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    });

    // Armazena sessionid e csrftoken para futuras requisições ao Django
    if (sessionId) {
      cookieStore.set('django_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 horas
        path: '/',
      });
    }

    if (csrfToken) {
      cookieStore.set('django_csrf', csrfToken, {
        httpOnly: false, // CSRF precisa ser acessível pelo JS
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 horas
        path: '/',
      });
    }

    console.log('🍪 [API Route] Cookies definidos no Next.js');

    return nextResponse;
  } catch (error: any) {
    console.error('❌ [API Route] Erro na requisição:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
