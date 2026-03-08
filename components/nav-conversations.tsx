'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontalIcon,
  PinIcon,
  ArchiveIcon,
  ShareIcon,
  Trash2Icon,
  GemIcon,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConversations,
  useArchiveConversation,
  useDeleteConversation,
  usePinConversation,
  useRegenerateTitle,
} from '@/hooks/use-conversations';
import { usePathname } from 'next/navigation';

type Conversation = {
  id: string;
  title: string;
  isPinned: boolean;
};

type ConversationItemProps = {
  item: Conversation;
  isMobile: boolean;
  isActive: boolean;
  onPin: () => void;
  onArchive: () => void;
  onRegenerateTitle: () => void;
  onDelete: () => void;
};

function ConversationItem({
  item,
  isMobile,
  isActive,
  onPin,
  onArchive,
  onRegenerateTitle,
  onDelete,
}: ConversationItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-20px 0px', once: false });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={`/chat/${item.id}`}>
            {item.isPinned && <GemIcon className="text-muted-foreground" />}
            <span className="truncate font-[450]">{item.title}</span>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover className="aria-expanded:bg-muted">
              <MoreHorizontalIcon />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-48 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align={isMobile ? 'end' : 'start'}
          >
            <DropdownMenuItem onClick={onPin}>
              <PinIcon className="text-muted-foreground" />
              <span>{item.isPinned ? 'Unpin' : 'Pin'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              <ArchiveIcon className="text-muted-foreground" />
              <span>Archive</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ShareIcon className="text-muted-foreground" />
              <span>Share</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRegenerateTitle}>
              <Sparkles className="text-muted-foreground" />
              <span>Regenerate Title</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2Icon className="text-destructive" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </motion.div>
  );
}

export function NavConversations() {
  const { isMobile } = useSidebar();
  const pathName = usePathname();
  const { data: conversations = [], isLoading } = useConversations();
  const archiveMutation = useArchiveConversation();
  const deleteMutation = useDeleteConversation();
  const pinMutation = usePinConversation();
  const regenerateTitleMutation = useRegenerateTitle();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Past Conversations</SidebarGroupLabel>
        <SidebarMenu>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuButton>
                  <Skeleton className="h-4 w-full rounded-md" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          {conversations.map((item) => (
            <ConversationItem
              key={item.id}
              item={item}
              isMobile={isMobile}
              isActive={pathName === `/chat/${item.id}`}
              onPin={() =>
                pinMutation.mutate({ id: item.id, isPinned: !item.isPinned })
              }
              onArchive={() => archiveMutation.mutate(item.id)}
              onRegenerateTitle={() => regenerateTitleMutation.mutate(item.id)}
              onDelete={() => setDeleteId(item.id)}
            />
          ))}
          {!isLoading && conversations.length === 0 && (
            <div className="px-2 py-1 text-sm text-sidebar-foreground/50">
              No conversations yet
            </div>
          )}
        </SidebarMenu>
      </SidebarGroup>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
