'use client';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ConversationDownload } from '@/components/ai-elements/conversation';
import { ToggleTheme } from '@/components/theme-switch';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { cn } from '@/lib/utils';

export function ChatHeader() {
  const params = useParams<{ id?: string }>();
  const conversationId = params?.id;
  const { open, isMobile } = useSidebar();

  const { data: messages } = useChatMessages(conversationId ?? '');

  return (
    <header className="static top-0 right-0 left-0 z-10 flex items-center justify-between border-b p-3 lg:absolute lg:w-full lg:border-none">
      <div className="flex items-center">
        <SidebarTrigger className="md:hidden" />
        <Tooltip>
          {/* The floating latch is the mark while the sidebar is stowed, so the
              nameplate stands down rather than sitting on top of it. */}
          <TooltipTrigger
            className={cn('type-wordmark flex text-lg md:text-xl', !open && !isMobile && 'hidden')}
          >
            Breeze<span className="text-primary">.</span>
          </TooltipTrigger>
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
