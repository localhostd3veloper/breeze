'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  messagesQueryKey,
  PENDING_CONVERSATION_ID,
  useChatMessages,
} from '@/hooks/use-chat-messages';
import type { ChatMessageDTO } from '@/lib/types/conversation';

import { ChatMessages } from './components/chat-messages';

/**
 * A new chat renders the pending transcript — the optimistic user message that
 * `useChatStream` writes before the conversation exists. The composer and the
 * health alert live in the layout, so this page is only the transcript.
 */
export function ChatClient() {
  const queryClient = useQueryClient();
  const { data: pending } = useChatMessages(PENDING_CONVERSATION_ID);

  /**
   * The pending key outlives the submit that filled it, so it has to be cleared
   * somewhere. Clearing it on the way out rather than on the way in means a fresh
   * /chat never has a stale transcript to hide — so there is nothing to gate the
   * first render on, and no flash to suppress. By unmount the handover to the real
   * conversation key has already happened, so nothing on screen depends on it.
   */
  useEffect(
    () => () => {
      queryClient.setQueryData<ChatMessageDTO[]>(messagesQueryKey(PENDING_CONVERSATION_ID), []);
    },
    [queryClient]
  );

  return <ChatMessages messages={pending ?? []} />;
}
