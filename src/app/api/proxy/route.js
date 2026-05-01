import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = {
      ...body,
      token: process.env.NEXT_PUBLIC_API_TOKEN // Puxa do cofre da Vercel
    };

    const response = await fetch(process.env.NEXT_PUBLIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  const url = `${process.env.NEXT_PUBLIC_API_URL}?action=${action}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return NextResponse.json(data);
}
