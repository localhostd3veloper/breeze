import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatStore {
  isAuthenticated: boolean;
  setAuthenticated: (authenticated: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      setAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),
    }),
    { name: 'breeze-chat' },
  ),
);
