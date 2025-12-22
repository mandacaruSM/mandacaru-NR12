// frontend/src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 [API Route] Fazendo logout no backend...');

    // Pega os tokens JWT para enviar ao Django
    const accessToken = request.cookies.get('access')?.value;
    const refreshToken = request.cookies.get('refresh')?.value;

    if (accessToken) {
      // Faz requisição ao backend Django com JWT no Authorization header
      const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('❌ [API Route] Erro no logout');
      } else {
        console.log('✅ [API Route] Logout bem-sucedido no backend');
      }
    }

    // Limpa TODOS os cookies independentemente do resultado
    const cookieStore = await cookies();
    cookieStore.delete('access');
    cookieStore.delete('refresh');

    console.log('✅ [API Route] Cookies limpos');

    return NextResponse.json({ detail: 'Logout realizado com sucesso' });
  } catch (error: any) {
    console.error('❌ [API Route] Erro na requisição:', error);

    // Mesmo com erro, limpa cookies locais
    const cookieStore = await cookies();
    cookieStore.delete('access');
    cookieStore.delete('refresh');

    return NextResponse.json(
      { error: error.message || 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
