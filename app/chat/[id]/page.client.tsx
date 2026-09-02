'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useChatMessages } from '@/hooks/use-chat-messages';
import { cn } from '@/lib/utils';

import { ChatMessages } from '../components/chat-messages';
import { useChatStream } from '../hooks/useChatStream';

interface ChatConversationClientProps {
  conversationId: string;
}

export function ChatConversationClient({ conversationId }: ChatConversationClientProps) {
  const router = useRouter();
  const { handleEditMessage, handleRegenerateMessage } = useChatStream(conversationId);

  const { data: messages, isLoading, isError, error } = useChatMessages(conversationId);

  /**
   * Arriving here from a brand-new chat, the cache is already warm and the
   * message is already on screen -- fading it in from zero would flash. Only a
   * cold load (a direct link, the sidebar) earns the intro.
   */
  const [hasWarmCache] = useState(() => (messages?.length ?? 0) > 0);
  const hasTranscript = isLoading || (messages?.length ?? 0) > 0;

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
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: isLoading ? 0 : 1 }}
        className={cn('flex min-h-0 flex-col', hasTranscript && 'flex-1')}
        initial={hasWarmCache ? false : { opacity: 0 }}
        key={conversationId}
        transition={{ duration: hasWarmCache ? 0 : 0.5, ease: 'easeOut' }}
      >
        <ChatMessages
          messages={messages ?? []}
          onEditMessage={handleEditMessage}
          onRegenerateMessage={handleRegenerateMessage}
        />
      </motion.div>
    </AnimatePresence>
  );
}
