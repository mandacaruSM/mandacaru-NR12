// frontend/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET(request: NextRequest) {
  try {
    console.log('👤 [API Route] Verificando usuário atual...');

    // Pega o sessionid armazenado nos cookies do Next.js
    const cookieStore = request.cookies;
    const sessionId = cookieStore.get('django_session')?.value;
    const csrfToken = cookieStore.get('django_csrf')?.value;

    console.log('🍪 [API Route] SessionID disponível:', sessionId ? 'SIM' : 'NÃO');

    if (!sessionId) {
      console.log('❌ [API Route] Sem sessionid, usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Monta o header Cookie para o Django
    let cookieHeader = `sessionid=${sessionId}`;
    if (csrfToken) {
      cookieHeader += `; csrftoken=${csrfToken}`;
    }

    // Faz requisição ao backend Django com o sessionid
    const response = await fetch(`${API_BASE_URL}/me/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      console.log('❌ [API Route] Django retornou', response.status);
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ [API Route] Usuário autenticado:', data.username);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [API Route] Erro na requisição:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar autenticação' },
      { status: 500 }
    );
  }
}
