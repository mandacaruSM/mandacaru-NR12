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
    // ✅ Preserva trailing slash da URL original
    // Ex: /api/proxy/cadastro/clientes/ -> afterProxy = /cadastro/clientes/
    const afterProxy = request.nextUrl.pathname.replace(/^\/api\/proxy/, '');
    const queryString = request.nextUrl.search || '';

    // Normaliza base URL sem barra no final
    const base = API_BASE_URL.replace(/\/+$/, '');
    const targetUrl = `${base}${afterProxy}${queryString}`;

    // Lê cookies de autenticação
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access')?.value;

    // Headers: não force JSON sempre (FormData/arquivos quebram)
    const headers: HeadersInit = {};
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    } else if (method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Prepara body (se houver)
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      // Se for multipart/form-data, repassa como arrayBuffer
      if (contentType?.includes('multipart/form-data')) {
        body = await request.arrayBuffer();
      } else {
        const text = await request.text();
        body = text || undefined;
      }
    }

    console.log(`🔀 [Proxy] ${method} ${afterProxy}${queryString}`);
    console.log(`🎯 [Proxy] Target: ${targetUrl}`);
    if (body && typeof body === 'string') {
      console.log(`📦 [Proxy] Body:`, body.substring(0, 200));
    }

    // ✅ Seguir redirects automaticamente (Render pode redirecionar HTTP → HTTPS)
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: 'follow',
    });

    console.log(`📨 [Proxy] Response status: ${response.status}`);

    const respContentType = response.headers.get('content-type');

    // Retorna JSON se for JSON
    if (respContentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`📥 [Proxy] Response data:`, data);

      // Se não for 2xx, loga como erro
      if (!response.ok) {
        console.error(`❌ [Proxy] Erro ${response.status}:`, data);
      }

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
