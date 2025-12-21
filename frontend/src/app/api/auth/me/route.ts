// frontend/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET(request: NextRequest) {
  try {
    console.log('👤 [API Route] Verificando usuário atual...');

    // Pega todos os cookies da requisição
    const cookieHeader = request.headers.get('cookie') || '';

    // Faz requisição ao backend Django, passando os cookies
    const response = await fetch(`${API_BASE_URL}/me/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader, // Encaminha cookies para o Django
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.log('❌ [API Route] Usuário não autenticado');
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
