'use client';

import { useQuery } from '@tanstack/react-query';

import type { ChatMessageDTO } from '@/lib/types/conversation';

async function fetchMessages(conversationId: string): Promise<ChatMessageDTO[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useChatMessages(conversationId: string) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
    staleTime: Infinity,
    retry: false,
  });
}
