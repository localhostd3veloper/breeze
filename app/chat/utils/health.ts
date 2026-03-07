'use server';

export async function getChatHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.OLLAMA_API_URL!}/health`);
    if (!response.ok) return false;
    return true;
  } catch (error) {
    console.error(error as Error);
    return false;
  }
}
