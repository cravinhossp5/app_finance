import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Força a execução rápida na Cloudflare

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Puxa o link do Google Script das variáveis da Cloudflare
    const targetUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!targetUrl) {
      return NextResponse.json({ error: "URL de destino não configurada" }, { status: 500 });
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        token: process.env.API_TOKEN || "Mu#22042002" // Token de segurança
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: "Falha na ponte (Proxy)", details: error.message }, { status: 500 });
  }
}
