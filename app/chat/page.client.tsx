'use client';

import { useQuery } from '@tanstack/react-query';
import { Coffee } from 'lucide-react';

import ChatInput from '@/components/Input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { ChatMessages } from './components/chat-messages';
import { useChatStream } from './hooks/useChatStream';
import { getChatHealth } from './utils/health';

export function ChatClient() {
  const { handleSubmit } = useChatStream();

  const { data: isChatAvailable } = useQuery({
    queryKey: ['chatHealth'],
    queryFn: getChatHealth,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  return (
    <>
      {/* Empty state — no messages until user starts a conversation */}
      <ChatMessages messages={[]} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        {isChatAvailable === false && (
          <Alert
            variant="destructive"
            className="animate-in fade-in slide-in-from-bottom-2 mb-4 border-orange-500/50 bg-orange-500/10 text-orange-600 duration-300 dark:border-orange-500/30 dark:text-orange-400"
          >
            <Coffee className="size-4" />
            <AlertTitle className="flex items-center gap-2">
              The AI is currently catching some Zs... 😴
            </AlertTitle>
            <AlertDescription>
              The backend is down — probably maintenance or the dev is asleep. You can browse past
              conversations, but new messages won&apos;t go through. Check back later!
            </AlertDescription>
          </Alert>
        )}
        <ChatInput onSubmit={handleSubmit} isChatAvailable={!!isChatAvailable} />
      </div>
    </>
  );
}
