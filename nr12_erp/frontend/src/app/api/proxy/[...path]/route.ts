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
    // ✅ Extrai path sem /api/proxy - MANTÉM a barra como veio
    const afterProxy = request.nextUrl.pathname.replace(/^\/api\/proxy/, '');
    const queryString = request.nextUrl.search || '';

    // Normaliza base URL sem barra no final
    const base = API_BASE_URL.replace(/\/+$/, '');

    // ✅ NÃO modifica a barra - repassa como o frontend enviou
    // Frontend DEVE enviar com barra para evitar redirect 308
    const targetUrl = `${base}${afterProxy}${queryString}`;

    // Lê cookies de autenticação
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access')?.value;

    // Headers: não force JSON sempre (FormData/arquivos quebram)
    const headers: HeadersInit = {};
    const contentType = request.headers.get('content-type');

    // Para multipart/form-data, NÃO definir Content-Type manualmente
    // O fetch vai definir automaticamente com o boundary correto
    const isMultipart = contentType?.includes('multipart/form-data');

    if (contentType && !isMultipart) {
      headers['Content-Type'] = contentType;
    } else if (method !== 'GET' && method !== 'DELETE' && !isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Prepara body (se houver)
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      // Se for multipart/form-data, repassa o formData original
      if (isMultipart) {
        body = await request.formData();
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

    const respContentType = response.headers.get('content-type') || '';

    // Retorna JSON se for JSON
    if (respContentType.includes('application/json')) {
      const data = await response.json();
      console.log(`📥 [Proxy] Response data:`, data);

      // Se não for 2xx, loga como erro
      if (!response.ok) {
        console.error(`❌ [Proxy] Erro ${response.status}:`, data);
      }

      return NextResponse.json(data, { status: response.status });
    }

    // Retorna binario se for imagem ou arquivo
    if (respContentType.includes('image/') || respContentType.includes('application/octet-stream')) {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: response.status,
        headers: {
          'Content-Type': respContentType,
          'Cache-Control': 'public, max-age=86400', // Cache por 1 dia
        },
      });
    }

    // Retorna texto se não for JSON nem binario
    const text = await response.text();
    return new NextResponse(text, { status: response.status });

  } catch (error: any) {
    console.error('❌ [Proxy] Erro:', error);
    console.error('❌ [Proxy] Erro name:', error?.name);
    console.error('❌ [Proxy] Erro cause:', error?.cause);

    // Detalhar erro para debugging
    let errorMessage = error.message || 'Erro no proxy';
    let errorDetails = '';

    if (error.cause) {
      errorDetails = ` (${error.cause.code || error.cause.message || JSON.stringify(error.cause)})`;
    }

    // Erros comuns de conexão
    if (error.message?.includes('fetch failed')) {
      if (error.cause?.code === 'ECONNREFUSED') {
        errorMessage = 'Backend não está respondendo (conexão recusada)';
      } else if (error.cause?.code === 'ENOTFOUND') {
        errorMessage = 'Backend não encontrado (DNS)';
      } else if (error.cause?.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout ao conectar com o backend';
      } else {
        errorMessage = `Falha ao conectar com o backend${errorDetails}`;
      }
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails || undefined },
      { status: 500 }
    );
  }
}
