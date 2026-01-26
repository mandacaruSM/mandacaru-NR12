// frontend/src/app/api/backend-media/[...path]/route.ts
// Proxy para servir arquivos de midia do backend (QR Codes, fotos, etc.)
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const mediaPath = resolvedParams.path.join('/');

    // Constrói URL do backend (remove /api/v1 e adiciona /media/)
    const backendBaseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const targetUrl = `${backendBaseUrl}/media/${mediaPath}`;

    console.log(`🖼️ [Media Proxy] GET /media/${mediaPath}`);
    console.log(`🎯 [Media Proxy] Target: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`❌ [Media Proxy] Erro ${response.status}`);
      return new NextResponse(null, { status: response.status });
    }

    // Pega o content-type do backend
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Retorna o arquivo
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache por 1 dia
      },
    });
  } catch (error: any) {
    console.error('❌ [Media Proxy] Erro:', error);
    return new NextResponse(null, { status: 500 });
  }
}
