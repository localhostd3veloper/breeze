export async function POST(req: Request) {
  const { message, model, history } = await req.json();

  const upstream = await fetch(`${process.env.OLLAMA_API_URL!}/completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.OLLAMA_API_KEY!,
    },
    body: JSON.stringify({ message, model, history }),
  });

  if (!upstream.ok) {
    return new Response(`Upstream error: ${upstream.status}`, {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
