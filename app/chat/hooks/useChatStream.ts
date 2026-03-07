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
    // flush remaining
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

export function useChatStream(conversationId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const handleSubmit = useCallback(
    async (text: string, model: string): Promise<void> => {
      let convId = conversationId;
      const isNewConversation = !convId;

      // --- 1. Create conversation if this is a new chat ---
      if (!convId) {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.slice(0, 100) }),
        });
        if (!res.ok) return;
        const { id } = await res.json();
        convId = id as string;

        // Pre-populate cache so /chat/[id] shows content immediately with no loading flash
        queryClient.setQueryData<ChatMessageDTO[]>(MESSAGES_KEY(convId), []);
        router.replace(`/chat/${convId}`);
      }

      const finalConvId = convId;

      // --- 2. Build message objects ---
      const now = new Date().toISOString();
      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();

      const userMsg: ChatMessageDTO = {
        id: userMsgId,
        role: 'user',
        content: text,
        createdAt: now,
      };

      const assistantMsg: ChatMessageDTO = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: now,
        isStreaming: true,
      };

      // --- 3. Optimistically add to cache ---
      setMessages(queryClient, finalConvId, (prev) => [
        ...prev,
        userMsg,
        assistantMsg,
      ]);

      // --- 4. Save user message to DB (fire-and-forget) ---
      fetch(`/api/conversations/${finalConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: text }),
      });

      // --- 5. Build history from cache (excluding the two messages just added) ---
      const history = getMessages(queryClient, finalConvId)
        .filter(
          (m) =>
            m.id !== userMsgId && m.id !== assistantMsgId && !m.isStreaming,
        )
        .map((m) => ({ role: m.role, content: m.content }));

      // --- 6. Start stream ---
      const streamRes = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.id && { 'X-User-Id': session.user.id }),
          'X-Session-Id': finalConvId,
        },
        body: JSON.stringify({ message: text, model, history }),
      });

      if (!streamRes.ok || !streamRes.body) {
        setMessages(queryClient, finalConvId, (prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `Error: ${streamRes.status} ${streamRes.statusText}`,
                  isStreaming: false,
                }
              : m,
          ),
        );
        return;
      }

      // --- 7. Parse NDJSON events and update cache live ---
      let fullText = '';
      let fullReasoning = '';

      for await (const event of parseNdjson(streamRes.body)) {
        if (event.type === 'text') {
          fullText += event.content;
          setMessages(queryClient, finalConvId, (prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: fullText } : m,
            ),
          );
        } else if (event.type === 'reasoning') {
          fullReasoning += event.content;
          setMessages(queryClient, finalConvId, (prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, reasoning: fullReasoning } : m,
            ),
          );
        } else if (event.type === 'error') {
          setMessages(queryClient, finalConvId, (prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: `Error: ${event.message}`,
                    isStreaming: false,
                  }
                : m,
            ),
          );
          return;
        } else if (event.type === 'done') {
          break;
        }
      }

      // --- 8. Mark streaming done ---
      setMessages(queryClient, finalConvId, (prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
        ),
      );

      // --- 9. Persist assistant message to DB ---
      await fetch(`/api/conversations/${finalConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: fullText,
          ...(fullReasoning && { reasoning: fullReasoning }),
        }),
      });

      // --- 10. Refresh sidebar conversation list ---
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // --- 11. Generate a real title for new conversations (fire-and-forget) ---
      if (isNewConversation) {
        fetch(`/api/conversations/${finalConvId}/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model }),
        }).then((res) => {
          if (res.ok) {
            // Re-invalidate so the sidebar shows the generated title
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        });
      }
    },
    [conversationId, router, queryClient, session?.user.id],
  );

  return { handleSubmit };
}
