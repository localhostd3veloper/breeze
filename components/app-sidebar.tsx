'use client';

import { PanelLeftCloseIcon, PanelLeftIcon } from 'lucide-react';
import { ComponentProps, PointerEvent, useState } from 'react';

import { NavConversations } from '@/components/nav-conversations';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  peekPanelClasses,
  SidebarLatch,
  SidebarMark,
  SidebarPeekProvider,
  SidebarPeekRail,
  SidebarPeekRegion,
  usePanelState,
  useSidebarPeek,
} from '@/components/sidebar-peek';
import { Kbd } from '@/components/ui/kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/**
 * The panel's own header. `p-2` and nothing taller, so the mark lands on the
 * exact rect the floating latch occupies — see `peekPanelClasses`. The pin
 * control on the right is the same button in both states, relabelled: while the
 * panel is only peeked it keeps it out for good, and once pinned it stows it.
 */
function SidebarPanelHeader() {
  const { open, isMobile, toggleSidebar } = useSidebar();
  const { peek, stowNow } = useSidebarPeek();
  const pinned = open || isMobile;

  // The panel slides out from under this button when it is used, and a portalled
  // tooltip has no idea its trigger just left the screen — it would be stranded
  // over the transcript. Radix closes on pointerdown, but not on ⌘B. Gating
  // Radix's own hover state on the panel being on screen is derived rather than
  // synchronised, so there is no setState-in-effect to cascade.
  const [hovering, setHovering] = useState(false);

  return (
    <SidebarHeader className="flex-row items-center justify-between p-2">
      <SidebarMark className="hover:bg-sidebar-accent" />

      <Tooltip open={hovering && (pinned || peek)} onOpenChange={setHovering}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={pinned ? 'Close sidebar' : 'Keep sidebar open'}
            onClick={() => {
              stowNow();
              toggleSidebar();
            }}
          >
            {pinned ? <PanelLeftCloseIcon /> : <PanelLeftIcon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{pinned ? 'Close sidebar' : 'Keep sidebar open'}</span>
          <Kbd className="text-muted-foreground/70">
            <span className="text-xs">⌘</span>B
          </Kbd>
        </TooltipContent>
      </Tooltip>
    </SidebarHeader>
  );
}

function SidebarPanel({ className, ...props }: ComponentProps<typeof Sidebar>) {
  const { isMobile } = useSidebar();
  const { cancelStow, stowPeek } = useSidebarPeek();
  const panel = usePanelState();

  // The panel keeps itself out while the pointer is inside it, and hands control
  // back to the grace period on the way out. On mobile `Sidebar` renders a Sheet
  // instead of a div, so there is no element to hang these on.
  const hover = isMobile
    ? undefined
    : {
        onPointerEnter: (event: PointerEvent) => event.pointerType === 'mouse' && cancelStow(),
        onPointerLeave: (event: PointerEvent) => event.pointerType === 'mouse' && stowPeek(),
      };

  return (
    <Sidebar
      collapsible="offcanvas"
      className={cn(peekPanelClasses, className)}
      // Parked at -16rem the panel is off screen but still focusable, so tabbing
      // off the latch walks through sixty invisible conversation links. `inert`
      // takes it out of the tab order and the a11y tree without touching a
      // single animatable property, which `visibility` could not do — it
      // interpolates discretely and popped the panel in halfway through the slide.
      inert={panel === 'stowed'}
      {...hover}
      {...props}
    >
      <SidebarPanelHeader />
      <SidebarContent>
        <NavMain />
        <NavConversations />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  // ⌘B is bound inside SidebarProvider already. Binding it here as well made
  // both handlers fire on one keypress, and two functional toggles in a batch
  // cancel out — the shortcut did nothing at all.
  return (
    <SidebarPeekProvider>
      <SidebarPeekRegion>
        <SidebarPeekRail />
        <SidebarLatch />
        <SidebarPanel {...props} />
      </SidebarPeekRegion>
    </SidebarPeekProvider>
  );
}
