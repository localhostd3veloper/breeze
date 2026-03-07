// FastAPI already emits typed NDJSON events — this route is a pure passthrough.
export async function POST(req: Request) {
  const body = await req.json();

  const upstream = await fetch(`${process.env.OLLAMA_API_URL!}/completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.OLLAMA_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ type: 'error', message: `Upstream error: ${upstream.status}` }) + '\n',
      { status: upstream.status, headers: { 'Content-Type': 'application/x-ndjson' } },
    );
  }

  return new Response(upstream.body, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
