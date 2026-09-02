'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

import { messagesQueryKey, PENDING_CONVERSATION_ID } from '@/hooks/use-chat-messages';
import type { GenUiMode } from '@/lib/genui/schema';
import type { ChatMessageDTO, MessageModes } from '@/lib/types/conversation';
import type { StreamEvent } from '@/lib/types/stream';

const MESSAGES_KEY = messagesQueryKey;

/** What a turn falls back to when it carries no recorded modes. */
const DEFAULT_GENUI_MODE: GenUiMode = 'auto';
const DEFAULT_MODES: MessageModes = {
  webSearch: true,
  thinking: false,
  genui: DEFAULT_GENUI_MODE,
};

function getMessages(qc: ReturnType<typeof useQueryClient>, convId: string): ChatMessageDTO[] {
  return qc.getQueryData<ChatMessageDTO[]>(MESSAGES_KEY(convId)) ?? [];
}

function setMessages(
  qc: ReturnType<typeof useQueryClient>,
  convId: string,
  updater: (prev: ChatMessageDTO[]) => ChatMessageDTO[]
) {
  qc.setQueryData<ChatMessageDTO[]>(MESSAGES_KEY(convId), (prev) => updater(prev ?? []));
}

async function* parseNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          yield JSON.parse(trimmed) as StreamEvent;
        } catch {
          // malformed line -- skip
        }
      }
    }
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer.trim()) as StreamEvent;
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}

interface UserMessageRef {
  id: string;
  content: string;
  images?: string[];
}

export function useChatStream(conversationId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  /**
   * Core: adds an optimistic assistant message, streams the LLM response,
   * and persists it to DB. The user message must already be in the cache.
   */
  const streamAssistant = useCallback(
    async (convId: string, userMsg: UserMessageRef, modes: MessageModes): Promise<void> => {
      const { webSearch, thinking, genui } = modes;
      const now = new Date().toISOString();
      const assistantMsgId = crypto.randomUUID();

      setMessages(queryClient, convId, (prev) => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '', createdAt: now, isStreaming: true },
      ]);

      const history = getMessages(queryClient, convId)
        .filter((m) => m.id !== userMsg.id && m.id !== assistantMsgId && !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const images = userMsg.images ?? [];

      const streamRes = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.id && { 'X-User-Id': session.user.id }),
          'X-Session-Id': convId,
        },
        body: JSON.stringify({
          message: userMsg.content,
          thinking,
          history,
          web_search: webSearch,
          genui,
          ...(images.length && {
            images: images.map((url) => (url.includes(',') ? url.split(',')[1] : url)),
          }),
        }),
      });

      if (!streamRes.ok || !streamRes.body) {
        setMessages(queryClient, convId, (prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `Error: ${streamRes.status} ${streamRes.statusText}`,
                  isStreaming: false,
                }
              : m
          )
        );
        return;
      }

      let fullText = '';
      let fullReasoning = '';

      for await (const event of parseNdjson(streamRes.body)) {
        if (event.type === 'text') {
          fullText += event.content;
          setMessages(queryClient, convId, (prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: fullText } : m))
          );
        } else if (event.type === 'reasoning') {
          fullReasoning += event.content;
          setMessages(queryClient, convId, (prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, reasoning: fullReasoning } : m))
          );
        } else if (event.type === 'error') {
          setMessages(queryClient, convId, (prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `Error: ${event.message}`, isStreaming: false }
                : m
            )
          );
          return;
        } else if (event.type === 'done') {
          break;
        }
      }

      setMessages(queryClient, convId, (prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
      );

      await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: fullText,
          ...(fullReasoning && { reasoning: fullReasoning }),
        }),
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    [queryClient, session?.user.id]
  );

  const handleSubmit = useCallback(
    async (
      text: string,
      webSearch = true,
      thinking = false,
      images: string[] = [],
      genui: GenUiMode = DEFAULT_GENUI_MODE
    ): Promise<void> => {
      // Recorded on the message so that editing or regenerating it later replays
      // the turn as it was asked, not as the composer happens to be set then.
      const modes: MessageModes = { webSearch, thinking, genui };
      let convId = conversationId;
      const isNewConversation = !convId;

      const userMsgId = crypto.randomUUID();
      const userMsg: ChatMessageDTO = {
        id: userMsgId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        ...(images.length && { images }),
        modes,
      };

      if (convId) {
        setMessages(queryClient, convId, (prev) => [...prev, userMsg]);
      } else {
        // No id yet. Park the message under the pending key so the transcript and
        // the composer's slide land on this tick rather than after the round trip.
        setMessages(queryClient, PENDING_CONVERSATION_ID, () => [userMsg]);

        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.slice(0, 100) }),
        });
        if (!res.ok) {
          // Roll back, which also returns the composer to the centre of the screen.
          setMessages(queryClient, PENDING_CONVERSATION_ID, () => []);
          return;
        }
        const { id } = await res.json();
        convId = id as string;

        // Hand the message to the real key before the route swaps, so /chat/[id]
        // paints the list that is already on screen instead of flashing empty.
        queryClient.setQueryData<ChatMessageDTO[]>(MESSAGES_KEY(convId), [userMsg]);
        router.replace(`/chat/${convId}`);
      }

      fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: text,
          ...(images.length && { images }),
          modes,
        }),
      });

      await streamAssistant(convId, { id: userMsgId, content: text, images }, modes);

      if (isNewConversation) {
        fetch(`/api/conversations/${convId}/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).then((res) => {
          if (res.ok) queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });
      }
    },
    [conversationId, router, queryClient, streamAssistant]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newText: string): Promise<void> => {
      const convId = conversationId;
      if (!convId) return;

      const allMessages = getMessages(queryClient, convId);
      const msgIndex = allMessages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      setMessages(queryClient, convId, () => allMessages.slice(0, msgIndex));

      await fetch(`/api/conversations/${convId}/messages?fromId=${messageId}`, {
        method: 'DELETE',
      });

      // Editing changes the *text* of a turn, not how it was asked. Both the
      // modes and any attachments carry over from the message being replaced --
      // previously this hardcoded "no search, no thinking" and silently dropped
      // the images, so an edited turn answered a different question.
      const original = allMessages[msgIndex];
      const modes = original.modes ?? DEFAULT_MODES;
      const images = original.images;

      const userMsgId = crypto.randomUUID();
      const userMsg: ChatMessageDTO = {
        id: userMsgId,
        role: 'user',
        content: newText,
        createdAt: new Date().toISOString(),
        ...(images?.length && { images }),
        modes,
      };

      setMessages(queryClient, convId, (prev) => [...prev, userMsg]);

      fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: newText,
          ...(images?.length && { images }),
          modes,
        }),
      });

      await streamAssistant(convId, { id: userMsgId, content: newText, images }, modes);
    },
    [conversationId, queryClient, streamAssistant]
  );

  const handleRegenerateMessage = useCallback(
    async (messageId: string): Promise<void> => {
      const convId = conversationId;
      if (!convId) return;

      const allMessages = getMessages(queryClient, convId);
      const msgIndex = allMessages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const precedingUserMsg = allMessages.slice(0, msgIndex).findLast((m) => m.role === 'user');
      if (!precedingUserMsg) return;

      setMessages(queryClient, convId, () => allMessages.slice(0, msgIndex));

      await fetch(`/api/conversations/${convId}/messages?fromId=${messageId}`, {
        method: 'DELETE',
      });

      // Regenerating re-asks the same question, so it re-uses that turn's modes.
      await streamAssistant(
        convId,
        {
          id: precedingUserMsg.id,
          content: precedingUserMsg.content,
          images: precedingUserMsg.images,
        },
        precedingUserMsg.modes ?? DEFAULT_MODES
      );
    },
    [conversationId, queryClient, streamAssistant]
  );

  return { handleSubmit, handleEditMessage, handleRegenerateMessage };
}
