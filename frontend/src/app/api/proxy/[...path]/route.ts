// frontend/src/app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Next.js 15 requer que params seja Promise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'DELETE');
}

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  try {
    // Reconstrói o path
    const targetPath = path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    // Lê cookies de autenticação
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access')?.value;
    const refreshToken = cookieStore.get('refresh')?.value;

    // Prepara headers para o backend
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Adiciona token JWT no Authorization header
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Prepara body (se houver)
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      const text = await request.text();
      body = text || undefined;
    }

    console.log(`🔀 [Proxy] ${method} /${targetPath}${queryString}`);

    // Faz requisição ao backend Django
    const response = await fetch(`${API_BASE_URL}/${targetPath}${queryString}`, {
      method,
      headers,
      body,
    });

    const contentType = response.headers.get('content-type');

    // Retorna JSON se for JSON
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    // Retorna texto se não for JSON
    const text = await response.text();
    return new NextResponse(text, { status: response.status });

  } catch (error: any) {
    console.error('❌ [Proxy] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro no proxy' },
      { status: 500 }
    );
  }
}
