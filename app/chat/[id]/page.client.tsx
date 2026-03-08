'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import ChatInput from '@/components/Input';
import { ChatMessages } from '../components/chat-messages';
import { useChatStream } from '../hooks/useChatStream';
import { getChatHealth } from '../utils/health';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Coffee } from 'lucide-react';

interface ChatConversationClientProps {
  conversationId: string;
}

export function ChatConversationClient({ conversationId }: ChatConversationClientProps) {
  const router = useRouter();
  const { handleSubmit, handleEditMessage, handleRegenerateMessage } = useChatStream(conversationId);

  const { data: messages, isLoading, isError, error } = useChatMessages(conversationId);

  const { data: isChatAvailable } = useQuery({
    queryKey: ['chatHealth'],
    queryFn: getChatHealth,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!isError) return;
    const status = error?.message;
    if (status === '404' || status === '403') {
      toast.error("Couldn't find that conversation");
    } else {
      toast.error('Failed to load conversation');
    }
    router.replace('/chat');
  }, [isError, error, router]);

  return (
    <>
      <ChatMessages messages={messages ?? []} isLoading={isLoading} onEditMessage={handleEditMessage} onRegenerateMessage={handleRegenerateMessage} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {isChatAvailable === false && (
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
              means the developer is asleep (and their PC is too) or we&apos;re
              doing some maintenance. <br />
              <strong>Good news:</strong> You can still read all your previous
              glorious conversations! <br />
              <strong>Bad news:</strong> You can&apos;t send any new ones right
              now. Check back later!
            </AlertDescription>
          </Alert>
        )}
        <ChatInput onSubmit={handleSubmit} isChatAvailable={!!isChatAvailable} />
      </div>
    </>
  );
}
