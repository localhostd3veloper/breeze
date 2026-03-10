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
import { useEffect, useState } from 'react';
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
import { useSearch } from '@/hooks/use-search';
import { Skeleton } from '@/components/ui/skeleton';

type Segment = { text: string; highlighted: boolean };

function segmentText(text: string, query: string): Segment[] {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return [{ text, highlighted: false }];
  const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
  return text.split(pattern).map((part, i) => ({ text: part, highlighted: i % 2 === 1 }));
}

function HighlightText({ text, query }: { text: string; query: string }) {
  return (
    <>
      {segmentText(text, query).map((seg, i) =>
        seg.highlighted ? (
          <mark key={i} className="rounded-[2px] bg-yellow-300/60 text-foreground dark:bg-yellow-500/40">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

export function NavMain() {
  const router = useRouter();
  const { open, setOpenMobile } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: conversations = [] } = useConversations();
  const { data: searchResults, isFetching } = useSearch(debouncedQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);


  useCtrlShortcut(
    'o',
    () => {
      router.push('/chat');
    },
    { shift: true },
  );

  useCtrlShortcut('k', () => setSearchOpen(true));

  const closeMobile = () => setOpenMobile(false);

  const navigate = (id: string) => {
    router.push(`/chat/${id}`);
    setSearchOpen(false);
    closeMobile();
  };

  const hasResults =
    (searchResults?.conversations.length ?? 0) > 0 ||
    (searchResults?.messages.length ?? 0) > 0;

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton onClick={() => { router.push('/chat'); closeMobile(); }}>
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
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) {
            setQuery('');
            setDebouncedQuery('');
          }
        }}
        title="Search conversations"
        description="Search your conversations and messages"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search conversations and messages..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {/* Empty query: show all conversations */}
            {!debouncedQuery && (
              <>
                <CommandEmpty>No conversations found.</CommandEmpty>
                <CommandGroup heading="Conversations">
                  {conversations.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => navigate(item.id)}
                    >
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Active query: show search results */}
            {debouncedQuery && (
              <>
                {isFetching && (
                  <div className="space-y-1 p-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-1.5 rounded-md px-2.5 py-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                )}
                {!isFetching && !hasResults && (
                  <CommandEmpty>No results found.</CommandEmpty>
                )}
                {!isFetching && (searchResults?.conversations.length ?? 0) > 0 && (
                  <CommandGroup heading="Conversations">
                    {searchResults!.conversations.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => navigate(item.id)}
                      >
                        <HighlightText text={item.title} query={debouncedQuery} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {!isFetching && (searchResults?.messages.length ?? 0) > 0 && (
                  <CommandGroup heading="Messages">
                    {searchResults!.messages.map((msg) => (
                      <CommandItem
                        key={msg.messageId}
                        value={msg.messageId}
                        onSelect={() => navigate(msg.conversationId)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.conversationTitle}
                        </span>
                        <span className="line-clamp-1 text-sm">
                          <HighlightText text={msg.snippet} query={debouncedQuery} />
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
