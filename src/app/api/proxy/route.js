import { NextResponse } from 'next/server';

async function encaminharParaAppsScript(payload) {
  const targetUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!targetUrl) {
    return NextResponse.json({ error: "URL de destino não configurada" }, { status: 500 });
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      token: process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN || "Mu#22042002"
    }),
  });

  const data = await response.json();
  if (typeof data?.texto_puro === 'string') {
    return new Response(data.texto_puro, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const body = await request.json();
    return await encaminharParaAppsScript(body);
  } catch (error) {
    return NextResponse.json({ error: "Falha na ponte (Proxy POST)", details: error.message }, { status: 500 });
  }
}

// Permite usar também a opção simples "Abrir site (HTTP GET)" no MacroDroid com 1 único link!
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'macro_resumo';
    const app = searchParams.get('app') || '';
    const titulo = searchParams.get('titulo') || '';
    const texto = searchParams.get('texto') || '';
    return await encaminharParaAppsScript({ action, app, titulo, texto });
  } catch (error) {
    return new Response("ERRO_PROXY", { status: 500 });
  }
}
