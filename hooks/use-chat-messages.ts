'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMessages } from '@/lib/services/chat-messages';

export function useChatMessages(conversationId: string) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
    staleTime: Infinity,
    retry: false,
  });
}
