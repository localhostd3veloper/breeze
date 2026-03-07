'use client';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { PlusSquare, Search } from 'lucide-react';
import { useCtrlShortcut } from '@/hooks/use-ctrl-shortcuts';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Kbd } from './ui/kbd';
import { useState } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useConversations } from '@/hooks/use-conversations';

export function NavMain() {
  const router = useRouter();
  const { open } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: conversations = [] } = useConversations();

  useCtrlShortcut(
    'o',
    () => {
      router.push('/chat');
    },
    { shift: true },
  );

  useCtrlShortcut('k', () => setSearchOpen(true));

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton onClick={() => router.push('/chat')}>
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
                <TooltipContent
                  className="flex items-center gap-2"
                  side="right"
                >
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
                <SidebarMenuButton onClick={() => setSearchOpen(true)}>
                  <Search />
                  <span>Search Chats</span>
                  {open && (
                    <Kbd className="ml-auto hidden text-muted-foreground/70 md:inline-flex">
                      <span className="text-xs">⌘</span>K
                    </Kbd>
                  )}
                </SidebarMenuButton>
              </TooltipTrigger>
              {!open && (
                <TooltipContent
                  className="flex items-center gap-2"
                  side="right"
                >
                  <span>Search Chats</span>
                  <Kbd className="hidden text-muted-foreground/70 md:inline-flex">
                    <span className="text-xs">⌘</span>K
                  </Kbd>
                </TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search conversations"
        description="Search your conversations"
      >
        <Command>
          <CommandInput placeholder="Search conversations..." />
          <CommandList>
            <CommandEmpty>No conversations found.</CommandEmpty>
            <CommandGroup heading="Conversations">
              {conversations.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => {
                    router.push(`/chat/${item.id}`);
                    setSearchOpen(false);
                  }}
                >
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
