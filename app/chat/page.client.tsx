'use client';

import ChatInput from '@/components/Input';
import { ChatMessages } from './components/chat-messages';
import { useChatStream } from './hooks/useChatStream';
import { AlertDescription, AlertTitle, Alert } from '@/components/ui/alert';
import { Coffee } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getChatHealth } from './utils/health';

export function ChatClient({ initialHealth }: { initialHealth: boolean }) {
  const { messages, handleSubmit } = useChatStream();

  const { data: isChatAvailable } = useQuery({
    queryKey: ['chatHealth'],
    queryFn: async () => {
      const isHealthy = await getChatHealth();
      return isHealthy;
    },
    initialData: initialHealth,
    refetchInterval: 10000,
  });

  return (
    <>
      <ChatMessages messages={messages} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {!isChatAvailable && (
          <Alert
            variant="destructive"
            className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 border-orange-500/50 bg-orange-500/10 text-orange-600 dark:border-orange-500/30 dark:text-orange-400"
          >
            <Coffee className="size-4" />
            <AlertTitle className="flex items-center gap-2">
              The AI is currently catching some Zs... 😴
            </AlertTitle>
            <AlertDescription>
              Our self-hosted LLM backend is currently unavailable. This usually
              means the developer is asleep (and their PC is too) or we're doing
              some maintenance. <br />
              <strong>Good news:</strong> You can still read all your previous
              glorious conversations! <br />
              <strong>Bad news:</strong> You can't send any new ones right now.
              Check back later!
            </AlertDescription>
          </Alert>
        )}
        <ChatInput
          onSubmit={handleSubmit}
          isChatAvailable={!!isChatAvailable}
        />
      </div>
    </>
  );
}
