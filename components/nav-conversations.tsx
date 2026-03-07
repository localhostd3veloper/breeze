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
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConversations,
  useArchiveConversation,
  useDeleteConversation,
  usePinConversation,
} from '@/hooks/use-conversations';
import { usePathname } from 'next/navigation';

export function NavConversations() {
  const { isMobile } = useSidebar();
  const pathName = usePathname();
  const { data: conversations = [], isLoading } = useConversations();
  const archiveMutation = useArchiveConversation();
  const deleteMutation = useDeleteConversation();
  const pinMutation = usePinConversation();
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
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={pathName === `/chat/${item.id}`}
              >
                <Link href={`/chat/${item.id}`}>
                  {item.isPinned && (
                    <GemIcon className="text-muted-foreground" />
                  )}
                  <span className="truncate font-[450]">{item.title}</span>{' '}
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction
                    showOnHover
                    className="aria-expanded:bg-muted"
                  >
                    <MoreHorizontalIcon />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? 'bottom' : 'right'}
                  align={isMobile ? 'end' : 'start'}
                >
                  <DropdownMenuItem
                    onClick={() =>
                      pinMutation.mutate({
                        id: item.id,
                        isPinned: !item.isPinned,
                      })
                    }
                  >
                    <PinIcon className="text-muted-foreground" />
                    <span>{item.isPinned ? 'Unpin' : 'Pin'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => archiveMutation.mutate(item.id)}
                  >
                    <ArchiveIcon className="text-muted-foreground" />
                    <span>Archive</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ShareIcon className="text-muted-foreground" />
                    <span>Share</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteId(item.id)}
                    variant="destructive"
                  >
                    <Trash2Icon className="text-destructive" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
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
