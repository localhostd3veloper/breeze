'use client';

import { useQuery } from '@tanstack/react-query';
import { Coffee } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useParams } from 'next/navigation';
import { Fragment, useSyncExternalStore } from 'react';

import ChatInput from '@/components/Input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PENDING_CONVERSATION_ID, useChatMessages } from '@/hooks/use-chat-messages';
import { cn } from '@/lib/utils';

import { useChatStream } from '../hooks/useChatStream';
import { emptyStateMessages } from '../utils/constants';
import { getChatHealth } from '../utils/health';

/** The composer lives in the layout and so mounts once per page load; caching the
 *  pick here matches the previous behaviour (one greeting per load) while keeping
 *  `readGreeting` referentially stable, which useSyncExternalStore requires. */
let cachedGreeting: string | undefined;

/** Fires once after hydration. Without a nudge React has no reason to re-render,
 *  so it would keep serving the server snapshot (null) and no greeting would ever
 *  appear. Deferred to a frame so the notification lands after paint. */
const subscribeOnce = (onStoreChange: () => void) => {
  const id = requestAnimationFrame(onStoreChange);
  return () => cancelAnimationFrame(id);
};
const readGreeting = () =>
  (cachedGreeting ??= emptyStateMessages[Math.floor(Math.random() * emptyStateMessages.length)]);
const readNoGreeting = () => null;

/**
 * The composer lives in the chat layout rather than in either page, so the same
 * DOM node survives the /chat → /chat/[id] navigation. That is what makes the
 * animation possible at all: one element changing position, not two swapping.
 *
 * `docked` is read off the transcript, and the transcript gains the user's message
 * synchronously on submit (see PENDING_CONVERSATION_ID) -- so the slide starts on
 * keypress rather than when the server answers.
 */
export function ChatComposer() {
  const params = useParams<{ id?: string }>();
  const conversationId = params?.id;

  const { handleSubmit } = useChatStream(conversationId);
  const { data: messages, isLoading } = useChatMessages(conversationId ?? PENDING_CONVERSATION_ID);

  const { data: isChatAvailable } = useQuery({
    queryKey: ['chatHealth'],
    queryFn: getChatHealth,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  // Null on the server, a greeting after hydration. A random pick during render
  // makes the server and client markup differ, and `suppressHydrationWarning`
  // only covers an element's own text -- once the greeting is split into per-word
  // spans that mismatch becomes a hard hydration error and React rebuilds the
  // tree. `useSyncExternalStore` is the sanctioned way to hand back a
  // client-only value without a setState-in-effect.
  const greeting = useSyncExternalStore(subscribeOnce, readGreeting, readNoGreeting);
  const reduceMotion = useReducedMotion();

  const docked = isLoading || (messages?.length ?? 0) > 0;

  const slide = reduceMotion
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 220, damping: 30 } as const);

  return (
    <div
      className={cn(
        'relative flex w-full flex-col',
        docked ? 'shrink-0' : 'min-h-0 flex-1 justify-center pb-14 md:pb-20'
      )}
    >
      <motion.div
        className="relative mx-auto w-full max-w-3xl px-2 md:px-4"
        layout
        layoutDependency={docked}
        transition={slide}
      >
        {/* Absolute so the headline can fade out while the input glides down,
            instead of collapsing its own row first and moving it twice. */}
        <AnimatePresence>
          {!docked && greeting && (
            <motion.h1
              animate={{ opacity: 1, y: 0 }}
              className="type-display absolute inset-x-2 bottom-full mb-7 text-center text-3xl md:inset-x-4 md:text-[2.5rem]"
              exit={{ opacity: 0, y: -14 }}
              // Entrance is the per-word mask reveal below; motion only owns the
              // exit, which has to stay here so the headline can fade while the
              // input glides down to dock.
              initial={{ opacity: 1, y: 0 }}
              key="greeting"
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
            >
              {/* Same treatment as the landing headline, but quicker: you meet this
                  screen many times a day, where you meet the landing page once. */}
              {greeting.split(' ').map((word, i) => (
                <Fragment key={`${i}-${word}`}>
                  {i > 0 && ' '}
                  <span className="reveal-mask">
                    <span
                      className="reveal-word"
                      style={{ animationDelay: `${i * 32}ms`, animationDuration: '0.55s' }}
                    >
                      {word}
                    </span>
                  </span>
                </Fragment>
              ))}
            </motion.h1>
          )}
        </AnimatePresence>

        {isChatAvailable === false && (
          <Alert
            className="animate-in fade-in slide-in-from-bottom-2 mb-3 border-orange-500/50 bg-orange-500/10 text-orange-600 duration-300 dark:border-orange-500/30 dark:text-orange-400"
            variant="destructive"
          >
            <Coffee className="size-4" />
            <AlertTitle className="flex items-center gap-2">
              The AI is currently catching some Zs... 😴
            </AlertTitle>
            <AlertDescription>
              The backend is down -- probably maintenance or the dev is asleep. You can browse past
              conversations, but new messages won&apos;t go through. Check back later!
            </AlertDescription>
          </Alert>
        )}

        <ChatInput isChatAvailable={!!isChatAvailable} onSubmit={handleSubmit} />

        {/* Only once there is a transcript to distrust. On an empty screen the
            headline should be the thing you read first. */}
        <p
          className={cn(
            'text-muted-foreground/80 pt-1.5 pb-2 text-center text-xs transition-opacity duration-300',
            docked ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          Breeze can make mistakes. Verify important information.
        </p>
      </motion.div>
    </div>
  );
}
