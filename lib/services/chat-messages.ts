import { ChatMessageDTO } from '../types/conversation';

export async function fetchMessages(conversationId: string): Promise<ChatMessageDTO[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
