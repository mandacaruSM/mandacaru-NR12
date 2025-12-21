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

    // Extrai TODOS os cookies do backend
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    console.log('🍪 [API Route] Cookies recebidos:', setCookieHeaders.length);

    // Cria response de sucesso
    const nextResponse = NextResponse.json(data);

    // Define cookie "access" para o middleware poder ler
    const cookieStore = await cookies();
    cookieStore.set('access', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hora
      path: '/',
    });

    // Encaminha TODOS os cookies do Django para o cliente
    // Isso é necessário para manter a sessão do Django
    if (setCookieHeaders.length > 0) {
      for (const setCookie of setCookieHeaders) {
        nextResponse.headers.append('Set-Cookie', setCookie);
      }
      console.log('🍪 [API Route] Cookies encaminhados para o cliente');
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
