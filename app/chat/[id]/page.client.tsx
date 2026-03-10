'use client';

import { useQuery } from '@tanstack/react-query';
import { Coffee } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import ChatInput from '@/components/Input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useChatMessages } from '@/hooks/use-chat-messages';

import { ChatMessages } from '../components/chat-messages';
import { useChatStream } from '../hooks/useChatStream';
import { getChatHealth } from '../utils/health';

interface ChatConversationClientProps {
  conversationId: string;
}

export function ChatConversationClient({ conversationId }: ChatConversationClientProps) {
  const router = useRouter();
  const { handleSubmit, handleEditMessage, handleRegenerateMessage } =
    useChatStream(conversationId);

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
      <AnimatePresence mode="wait">
        <motion.div
          key={conversationId}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <ChatMessages
            messages={messages ?? []}
            isLoading={isLoading}
            onEditMessage={handleEditMessage}
            onRegenerateMessage={handleRegenerateMessage}
          />
        </motion.div>
      </AnimatePresence>
      <div className="mx-auto w-full max-w-3xl px-2 pb-2 md:px-4">
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
