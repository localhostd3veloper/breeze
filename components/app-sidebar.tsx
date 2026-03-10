'use client';

import { PanelLeftIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { NavConversations } from '@/components/nav-conversations';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Kbd } from '@/components/ui/kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useCtrlShortcut } from '@/hooks/use-ctrl-shortcuts';
import { cn } from '@/lib/utils';

import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open, isMobile, toggleSidebar } = useSidebar();
  const router = useRouter();

  const handleLogoClick = () => {
    if (open) router.push('/');
    else toggleSidebar();
  };

  useCtrlShortcut('b', toggleSidebar);
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex-row items-center justify-between py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleLogoClick} className="group/logo">
              <Image
                src="/favicon.svg"
                alt="Breeze Logo"
                width={32}
                height={32}
                className="text-primary h-6 stroke-[1.5] transition-opacity group-data-[state=collapsed]:group-hover/logo:hidden"
              />
              <PanelLeftIcon className="text-primary absolute opacity-0 transition-opacity group-data-[state=collapsed]:group-hover/logo:opacity-100" />
            </Button>
          </TooltipTrigger>
          {!open && (
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>Open Sidebar</span>
              <Kbd className="text-muted-foreground/70">
                <span className="text-xs">⌘</span>B
              </Kbd>
            </TooltipContent>
          )}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger
              className={cn('hidden', (open || isMobile) && 'flex items-center justify-center')}
            />
          </TooltipTrigger>
          {open && (
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>Close Sidebar</span>
              <Kbd className="text-muted-foreground/70">
                <span className="text-xs">⌘</span>B
              </Kbd>
            </TooltipContent>
          )}
        </Tooltip>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavConversations />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
