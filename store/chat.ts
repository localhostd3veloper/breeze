import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * The composer's mode switches. `images` is not a switch -- it is derived from the
 * attachment tray -- but it shares the ordering so the composer's accent can treat
 * "attached an image" as just another thing that was turned on last.
 */
export type ComposerMode = 'thinking' | 'web' | 'visual' | 'images';

/** Web search is on out of the box; see the acquire pass in `backend/chat.py`. */
const DEFAULT_MODES: ComposerMode[] = ['web'];

interface ChatStore {
  isAuthenticated: boolean;
  setAuthenticated: (authenticated: boolean) => void;

  /**
   * Ordered, newest-enabled last -- the order is what tells the composer which
   * accent its border should wear, so there is nowhere for the two to disagree.
   *
   * This lives in the store rather than in the composer because the composer
   * unmounts: sending the first message navigates `/chat` -> `/chat/[id]`, which
   * used to reset every switch the user had just set.
   */
  modes: ComposerMode[];
  setMode: (mode: ComposerMode, on: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      modes: DEFAULT_MODES,
      setMode: (mode, on) =>
        set((state) => {
          const without = state.modes.filter((m) => m !== mode);
          if (on) return { modes: [...without, mode] };
          // `{}` rather than `{ modes: without }` when nothing changed, so turning
          // off an already-off mode does not notify subscribers.
          return without.length === state.modes.length ? {} : { modes: without };
        }),
    }),
    {
      name: 'breeze-chat',
      /**
       * `images` is derived from the attachment tray, so persisting it would
       * restore an images accent on a composer with nothing attached.
       */
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        modes: state.modes.filter((m) => m !== 'images'),
      }),
      /**
       * The composer server-renders with `DEFAULT_MODES`. Reading localStorage
       * during store creation would make the client's first render disagree with
       * that HTML, so rehydration is deferred to after mount -- see `Composer`.
       */
      skipHydration: true,
    }
  )
);
