'use client';
import { ToggleTheme } from '@/components/theme-switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConversationDownload } from '@/components/ai-elements/conversation';
import { Heart } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useChatMessages } from '@/hooks/use-chat-messages';

export function ChatHeader() {
  const params = useParams<{ id?: string }>();
  const conversationId = params?.id;

  const { data: messages } = useChatMessages(conversationId ?? '');

  return (
    <header className="static z-10 lg:absolute top-0 left-0 right-0 lg:w-full flex items-center justify-between border-b lg:border-none p-3">
      <div className="logo font-satisfy text-lg md:text-xl flex items-center">
        <SidebarTrigger className="md:hidden" />
        <Tooltip>
          <TooltipTrigger className="flex gap-1">Breeze.</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-0.5">
            Made with <Heart className="size-3 text-destructive" /> by
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
