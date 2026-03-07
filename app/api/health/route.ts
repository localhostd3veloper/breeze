export async function GET() {
  const response = await fetch(`${process.env.OLLAMA_API_URL!}/health`);

  if (!response.ok) {
    return new Response(`response error: ${response.status}`, {
      status: response.status,
    });
  }

  return new Response(`response error: ${response.status}`, {
    status: response.status,
  });
}
