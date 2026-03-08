'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatMessageDTO } from '@/lib/types/conversation';
import type { StreamEvent } from '@/lib/types/stream';

const MESSAGES_KEY = (id: string) => ['conversations', id, 'messages'];

function getMessages(
  qc: ReturnType<typeof useQueryClient>,
  convId: string,
): ChatMessageDTO[] {
  return qc.getQueryData<ChatMessageDTO[]>(MESSAGES_KEY(convId)) ?? [];
}

function setMessages(
  qc: ReturnType<typeof useQueryClient>,
  convId: string,
  updater: (prev: ChatMessageDTO[]) => ChatMessageDTO[],
) {
  qc.setQueryData<ChatMessageDTO[]>(MESSAGES_KEY(convId), (prev) =>
    updater(prev ?? []),
  );
}

async function* parseNdjson(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
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
          // malformed line — skip
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
    async (
      convId: string,
      userMsg: UserMessageRef,
      webSearch: boolean,
      thinking: boolean,
    ): Promise<void> => {
      const now = new Date().toISOString();
      const assistantMsgId = crypto.randomUUID();

      setMessages(queryClient, convId, (prev) => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '', createdAt: now, isStreaming: true },
      ]);

      // Build history: everything except the current user message and the new assistant placeholder
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
          ...(images.length && {
            images: images.map((url) => (url.includes(',') ? url.split(',')[1] : url)),
          }),
        }),
      });

      if (!streamRes.ok || !streamRes.body) {
        setMessages(queryClient, convId, (prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `Error: ${streamRes.status} ${streamRes.statusText}`, isStreaming: false }
              : m,
          ),
        );
        return;
      }

      let fullText = '';
      let fullReasoning = '';

      for await (const event of parseNdjson(streamRes.body)) {
        if (event.type === 'text') {
          fullText += event.content;
          setMessages(queryClient, convId, (prev) =>
            prev.map((m) => m.id === assistantMsgId ? { ...m, content: fullText } : m),
          );
        } else if (event.type === 'reasoning') {
          fullReasoning += event.content;
          setMessages(queryClient, convId, (prev) =>
            prev.map((m) => m.id === assistantMsgId ? { ...m, reasoning: fullReasoning } : m),
          );
        } else if (event.type === 'error') {
          setMessages(queryClient, convId, (prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `Error: ${event.message}`, isStreaming: false }
                : m,
            ),
          );
          return;
        } else if (event.type === 'done') {
          break;
        }
      }

      setMessages(queryClient, convId, (prev) =>
        prev.map((m) => m.id === assistantMsgId ? { ...m, isStreaming: false } : m),
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
    [queryClient, session?.user.id],
  );

  const handleSubmit = useCallback(
    async (text: string, webSearch = false, thinking = false, images: string[] = []): Promise<void> => {
      let convId = conversationId;
      const isNewConversation = !convId;

      if (!convId) {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.slice(0, 100) }),
        });
        if (!res.ok) return;
        const { id } = await res.json();
        convId = id as string;
        queryClient.setQueryData<ChatMessageDTO[]>(MESSAGES_KEY(convId), []);
        router.replace(`/chat/${convId}`);
      }

      const userMsgId = crypto.randomUUID();
      const userMsg: ChatMessageDTO = {
        id: userMsgId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        ...(images.length && { images }),
      };

      setMessages(queryClient, convId, (prev) => [...prev, userMsg]);

      // Save user message to DB (fire-and-forget)
      fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: text, ...(images.length && { images }) }),
      });

      await streamAssistant(convId, { id: userMsgId, content: text, images }, webSearch, thinking);

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
    [conversationId, router, queryClient, streamAssistant],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newText: string): Promise<void> => {
      const convId = conversationId;
      if (!convId) return;

      const allMessages = getMessages(queryClient, convId);
      const msgIndex = allMessages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      // Trim cache: remove the edited message and everything after
      setMessages(queryClient, convId, () => allMessages.slice(0, msgIndex));

      await fetch(`/api/conversations/${convId}/messages?fromId=${messageId}`, {
        method: 'DELETE',
      });

      // Add the edited message as a new user message
      const userMsgId = crypto.randomUUID();
      const userMsg: ChatMessageDTO = {
        id: userMsgId,
        role: 'user',
        content: newText,
        createdAt: new Date().toISOString(),
      };

      setMessages(queryClient, convId, (prev) => [...prev, userMsg]);

      fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: newText }),
      });

      await streamAssistant(convId, { id: userMsgId, content: newText }, false, false);
    },
    [conversationId, queryClient, streamAssistant],
  );

  const handleRegenerateMessage = useCallback(
    async (messageId: string): Promise<void> => {
      const convId = conversationId;
      if (!convId) return;

      const allMessages = getMessages(queryClient, convId);
      const msgIndex = allMessages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      // Find the user message that prompted this assistant response
      const precedingUserMsg = allMessages.slice(0, msgIndex).findLast((m) => m.role === 'user');
      if (!precedingUserMsg) return;

      // Remove only the assistant message and everything after it
      setMessages(queryClient, convId, () => allMessages.slice(0, msgIndex));

      await fetch(`/api/conversations/${convId}/messages?fromId=${messageId}`, {
        method: 'DELETE',
      });

      await streamAssistant(
        convId,
        { id: precedingUserMsg.id, content: precedingUserMsg.content, images: precedingUserMsg.images },
        false,
        false,
      );
    },
    [conversationId, queryClient, streamAssistant],
  );

  return { handleSubmit, handleEditMessage, handleRegenerateMessage };
}
