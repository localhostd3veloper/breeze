import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  appendChunk: (id: string, chunk: string) => void;
  updateMessage: (id: string, text: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),
      appendChunk: (id, chunk) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, text: m.text + chunk } : m,
          ),
        })),
      updateMessage: (id, text) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, text } : m,
          ),
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'breeze-chat' },
  ),
);
