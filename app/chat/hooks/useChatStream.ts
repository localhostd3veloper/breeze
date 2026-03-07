import { useCallback } from 'react';
import { useChatStore } from '@/store/chat';

export function useChatStream() {
  const { messages, addMessage, appendChunk, updateMessage } = useChatStore();

  const handleSubmit = useCallback(
    async (text: string, model: string): Promise<void> => {
      const userId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();

      const history = messages.map((m) => ({ role: m.role, content: m.text }));

      addMessage({ id: userId, role: 'user', text });
      addMessage({ id: assistantId, role: 'assistant', text: '' });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, model, history }),
      });

      if (!res.ok || !res.body) {
        updateMessage(assistantId, `Error: ${res.status} ${res.statusText}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendChunk(assistantId, decoder.decode(value, { stream: true }));
      }
    },
    [messages, addMessage, appendChunk, updateMessage],
  );

  return {
    messages,
    handleSubmit,
  };
}
