'use client';

import { PlusSquare, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { usePeekLock, useSidebarPeek } from '@/components/sidebar-peek';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversations } from '@/hooks/use-conversations';
import { useCtrlShortcut } from '@/hooks/use-ctrl-shortcuts';
import { useSearch } from '@/hooks/use-search';

import { Kbd } from './ui/kbd';

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
          <span
            key={i}
            className="text-foreground rounded-[2px] bg-yellow-300/60 dark:bg-yellow-500/40"
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

export function NavMain() {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { stowNow } = useSidebarPeek();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // The search dialog is a centred modal; letting the panel slide out from
  // behind it as it opens reads as a glitch.
  usePeekLock(searchOpen);

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
    { shift: true }
  );

  useCtrlShortcut('k', () => setSearchOpen(true));

  const dismiss = () => {
    setOpenMobile(false);
    stowNow();
  };

  const navigate = (id: string) => {
    router.push(`/chat/${id}`);
    setSearchOpen(false);
    dismiss();
  };

  const hasResults =
    (searchResults?.conversations.length ?? 0) > 0 || (searchResults?.messages.length ?? 0) > 0;

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {/* No tooltips here any more. They existed for the old icon rail, where
              a collapsed sidebar showed these as unlabelled icons. The sidebar is
              offcanvas now: whenever these buttons are on screen so are their
              labels, so a tooltip could only ever repeat one -- or get stranded
              over the transcript when the panel slid away from under a hovered
              trigger, which is what it did on ⌘B. */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                router.push('/chat');
                dismiss();
              }}
            >
              <PlusSquare />
              <span>New Chat</span>
              <Kbd className="text-muted-foreground/70 ml-auto hidden md:inline-flex">
                <span className="text-xs">⌘⇧</span>O
              </Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setSearchOpen(true)}>
              <Search />
              <span>Search Chats</span>
              <Kbd className="text-muted-foreground/70 ml-auto hidden md:inline-flex">
                <span className="text-xs">⌘</span>K
              </Kbd>
            </SidebarMenuButton>
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
                    <CommandItem key={item.id} value={item.id} onSelect={() => navigate(item.id)}>
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
                {!isFetching && !hasResults && <CommandEmpty>No results found.</CommandEmpty>}
                {!isFetching && (searchResults?.conversations.length ?? 0) > 0 && (
                  <CommandGroup heading="Conversations">
                    {searchResults!.conversations.map((item) => (
                      <CommandItem key={item.id} value={item.id} onSelect={() => navigate(item.id)}>
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
                        <span className="text-muted-foreground text-xs font-medium">
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
