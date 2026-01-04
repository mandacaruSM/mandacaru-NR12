// frontend/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET(request: NextRequest) {
  try {
    console.log('👤 [API Route] Verificando usuário atual...');

    // Pega os tokens JWT armazenados nos cookies do Next.js
    const cookieStore = request.cookies;
    const accessToken = cookieStore.get('access')?.value;
    const refreshToken = cookieStore.get('refresh')?.value;

    console.log('🍪 [API Route] Access token disponível:', accessToken ? 'SIM' : 'NÃO');

    if (!accessToken) {
      console.log('❌ [API Route] Sem access token, usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Faz requisição ao backend Django com JWT no Authorization header
    const response = await fetch(`${API_BASE_URL}/me/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
