'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMessages } from '@/lib/services/chat-messages';

/**
 * Stand-in conversation id for a chat that has not been created yet.
 *
 * A new chat has no id until `POST /api/conversations` answers, but the composer
 * should slide down and show the message on keypress -- not a round trip later. The
 * optimistic user message therefore lands under this key, which `/chat` renders and
 * `useChatStream` hands over to the real key once the id exists.
 */
export const PENDING_CONVERSATION_ID = 'pending';

export const messagesQueryKey = (conversationId: string) =>
  ['conversations', conversationId, 'messages'] as const;

export function useChatMessages(conversationId: string) {
  return useQuery({
    queryKey: messagesQueryKey(conversationId),
    queryFn: () => fetchMessages(conversationId),
    // The pending conversation exists only in the cache -- there is nothing to fetch.
    enabled: !!conversationId && conversationId !== PENDING_CONVERSATION_ID,
    staleTime: Infinity,
    retry: false,
  });
}
