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

    // Cria response de sucesso com os dados do usuário
    const nextResponse = NextResponse.json(data);

    // Repassa os cookies Set-Cookie do Django para o cliente
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    console.log('🍪 [API Route] Repassando', setCookieHeaders.length, 'cookies do Django');

    for (const cookie of setCookieHeaders) {
      nextResponse.headers.append('Set-Cookie', cookie);
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
