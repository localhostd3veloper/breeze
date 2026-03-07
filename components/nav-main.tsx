'use client';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { PlusSquare, SearchCode } from 'lucide-react';
import { useCtrlShortcut } from '@/hooks/use-ctrl-shortcuts';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Kbd } from './ui/kbd';
import { useChatStore } from '@/store/chat';

export function NavMain() {
  const router = useRouter();
  const { open } = useSidebar();

  useCtrlShortcut(
    'o',
    () => {
      router.push('/chat');
    },
    { shift: true },
  );

  useCtrlShortcut('k', () => {
    // Implement global search trigger here
    console.log('Search triggered');
  });

  const { clearMessages } = useChatStore();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton
                onClick={() => {
                  clearMessages();
                  router.push('/chat');
                }}
              >
                <PlusSquare />
                <span>New Chat</span>
                {open && (
                  <Kbd className="ml-auto hidden text-muted-foreground/70 md:inline-flex">
                    <span className="text-xs">⌘⇧</span>O
                  </Kbd>
                )}
              </SidebarMenuButton>
            </TooltipTrigger>
            {!open && (
              <TooltipContent className="flex items-center gap-2" side="right">
                <span>New Chat</span>
                <Kbd className="hidden text-muted-foreground/70 md:inline-flex">
                  <span className="text-xs">⌘⇧</span>O
                </Kbd>
              </TooltipContent>
            )}
          </Tooltip>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton onClick={() => console.log('Search clicked')}>
                <SearchCode />
                <span>Search Conversations</span>
                {open && (
                  <Kbd className="ml-auto hidden text-muted-foreground/70 md:inline-flex">
                    <span className="text-xs">⌘</span>K
                  </Kbd>
                )}
              </SidebarMenuButton>
            </TooltipTrigger>
            {!open && (
              <TooltipContent className="flex items-center gap-2" side="right">
                <span>Search Conversations</span>
                <Kbd className="hidden text-muted-foreground/70 md:inline-flex">
                  <span className="text-xs">⌘</span>K
                </Kbd>
              </TooltipContent>
            )}
          </Tooltip>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
