import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Puxando a URL do Google Apps Script das variáveis de ambiente (Segurança)
    const googleUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!googleUrl) {
      return NextResponse.json({ error: "A URL da API (Google Apps Script) não está configurada no Cloudflare." }, { status: 500 });
    }

    // Despachando os dados para a planilha
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Embutindo o Token de Segurança automaticamente
      body: JSON.stringify({
        ...body,
        token: 'Mu#22042002' 
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    return NextResponse.json({ error: "Falha na ponte de comunicação (Proxy)." }, { status: 500 });
  }
}

// Opcional: Um GET simples para testar se a ponte está de pé
export async function GET() {
  return NextResponse.json({ status: "Ponte Next.js <> Google Sheets OK", version: "1.0" });
}
