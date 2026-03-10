'use client';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ConversationDownload } from '@/components/ai-elements/conversation';
import { ToggleTheme } from '@/components/theme-switch';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatMessages } from '@/hooks/use-chat-messages';

export function ChatHeader() {
  const params = useParams<{ id?: string }>();
  const conversationId = params?.id;

  const { data: messages } = useChatMessages(conversationId ?? '');

  return (
    <header className="static top-0 right-0 left-0 z-10 flex items-center justify-between border-b p-3 lg:absolute lg:w-full lg:border-none">
      <div className="logo font-satisfy flex items-center text-lg md:text-xl">
        <SidebarTrigger className="md:hidden" />
        <Tooltip>
          <TooltipTrigger className="flex gap-1">Breeze.</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-0.5">
            Made with <Heart className="text-destructive size-3" /> by
            <Link href="https://github.com/localhostd3veloper" target="_blank">
              @localhostd3veloper
            </Link>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        {messages && messages.length > 0 && (
          <ConversationDownload
            className="static rounded-md"
            messages={messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            }))}
          />
        )}
        <ToggleTheme />
      </div>
    </header>
  );
}
