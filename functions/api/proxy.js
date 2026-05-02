export async function onRequest(context) {
  const { request, env } = context;

  // Só aceita chamadas POST
  if (request.method !== "POST") {
    return new Response("Apenas POST permitido", { status: 405 });
  }

  try {
    const body = await request.json();
    
    // Pega a URL do Google Script das variáveis de ambiente da Cloudflare
    const targetUrl = env.NEXT_PUBLIC_API_URL; 

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        token: env.API_TOKEN || "Mu#22042002" // Garante o envio do token de segurança
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Falha na ponte (Proxy)", details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
