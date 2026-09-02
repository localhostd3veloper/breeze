'use client';

import { PanelLeftIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Kbd } from '@/components/ui/kbd';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Hover-peek for a fully stowed sidebar.
 *
 * Three states, not two. `open` (from `useSidebar`) is the *pinned* state and it
 * moves layout: the gap element takes width and the transcript shifts over.
 * `peek` is transient -- the panel floats above the content and nothing reflows,
 * because a pointer that merely brushes the left edge must not move the text
 * someone is reading.
 *
 * Peek is mouse-only. Touch has no hover and a pen shouldn't arm a 16px strip by
 * accident, so both fall through to the latch button and ⌘B.
 */

/** Intent, so crossing the edge in transit doesn't fire the panel. */
const OPEN_DELAY = 90;
/** Grace, so the seam between rail, latch and panel is crossable. */
const STOW_DELAY = 220;

type SidebarPeekContextValue = {
  peek: boolean;
  /** Arm the panel after the intent delay. */
  openPeek: () => void;
  /** Retire it after the grace period. */
  stowPeek: () => void;
  /** The pointer came back -- abandon a pending stow. */
  cancelStow: () => void;
  /** Retire it now: Esc, a pin, a navigation. */
  stowNow: () => void;
  registerLock: (id: string, locked: boolean) => void;
};

const SidebarPeekContext = React.createContext<SidebarPeekContextValue | null>(null);

function useSidebarPeek() {
  const context = React.useContext(SidebarPeekContext);
  if (!context) {
    throw new Error('useSidebarPeek must be used within a SidebarPeekProvider.');
  }
  return context;
}

/**
 * Holds the peeked panel out while an overlay anchored inside it is up.
 *
 * The ⋯ and account menus render into a portal outside the panel, so reaching
 * one means the pointer "leaves" the panel and the panel would slide away from
 * under its own menu. Call this with the overlay's open state.
 */
export function usePeekLock(locked: boolean) {
  const { registerLock } = useSidebarPeek();
  const id = React.useId();

  React.useEffect(() => {
    registerLock(id, locked);
    return () => registerLock(id, false);
  }, [id, locked, registerLock]);
}

export function SidebarPeekProvider({ children }: { children: React.ReactNode }) {
  const { open, isMobile } = useSidebar();
  const [peek, setPeek] = React.useState(false);

  const openTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stowTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const locks = React.useRef(new Set<string>());
  const pointerAway = React.useRef(true);

  const clearOpenTimer = () => {
    clearTimeout(openTimer.current);
    openTimer.current = undefined;
  };
  const clearStowTimer = () => {
    clearTimeout(stowTimer.current);
    stowTimer.current = undefined;
  };

  const stowNow = React.useCallback(() => {
    clearOpenTimer();
    clearStowTimer();
    setPeek(false);
  }, []);

  const scheduleStow = React.useCallback(() => {
    clearOpenTimer();
    clearStowTimer();
    stowTimer.current = setTimeout(() => {
      stowTimer.current = undefined;
      // A menu is up. Leave the panel out; `registerLock` retries on release.
      if (locks.current.size > 0) return;
      setPeek(false);
    }, STOW_DELAY);
  }, []);

  const openPeek = React.useCallback(() => {
    pointerAway.current = false;
    clearStowTimer();
    if (openTimer.current) return;
    openTimer.current = setTimeout(() => {
      openTimer.current = undefined;
      setPeek(true);
    }, OPEN_DELAY);
  }, []);

  const stowPeek = React.useCallback(() => {
    pointerAway.current = true;
    scheduleStow();
  }, [scheduleStow]);

  const cancelStow = React.useCallback(() => {
    pointerAway.current = false;
    clearStowTimer();
  }, []);

  const registerLock = React.useCallback(
    (id: string, locked: boolean) => {
      if (locked) {
        locks.current.add(id);
        clearStowTimer();
        return;
      }
      locks.current.delete(id);
      if (locks.current.size === 0 && pointerAway.current) scheduleStow();
    },
    [scheduleStow]
  );

  // Pinning the sidebar, or dropping to the mobile sheet, retires the overlay.
  React.useEffect(() => {
    if (open || isMobile) stowNow();
  }, [open, isMobile, stowNow]);

  React.useEffect(() => {
    if (!peek) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      // A dialog opened from the panel owns Escape first; it holds a lock.
      if (event.key === 'Escape' && locks.current.size === 0) stowNow();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [peek, stowNow]);

  React.useEffect(
    () => () => {
      clearOpenTimer();
      clearStowTimer();
    },
    []
  );

  const value = React.useMemo<SidebarPeekContextValue>(
    () => ({ peek, openPeek, stowPeek, cancelStow, stowNow, registerLock }),
    [peek, openPeek, stowPeek, cancelStow, stowNow, registerLock]
  );

  return <SidebarPeekContext.Provider value={value}>{children}</SidebarPeekContext.Provider>;
}

/**
 * Collapses the three states into one attribute a Tailwind `group-data-*`
 * variant can read. One attribute rather than a `peek` flag stacked on the
 * primitive's own `data-collapsible`, because the panel's geometry depends on
 * both and stacked group variants are miserable to read.
 *
 * `display: contents` so the wrapper adds nothing to the layout it wraps.
 */
export type PanelState = 'mobile' | 'pinned' | 'peek' | 'stowed';

export function usePanelState(): PanelState {
  const { open, isMobile } = useSidebar();
  const { peek } = useSidebarPeek();
  return isMobile ? 'mobile' : open ? 'pinned' : peek ? 'peek' : 'stowed';
}

export function SidebarPeekRegion({ children }: { children: React.ReactNode }) {
  const panel = usePanelState();

  return (
    <div data-panel={panel} className="group/peek contents">
      {children}
    </div>
  );
}

/**
 * Geometry for the peeked panel, applied to `Sidebar`'s fixed container.
 *
 * The 8px inset is not a taste call, it is registration. `SidebarHeader` pads
 * 8px and holds a 36px mark, so the panel's own mark lands at (16, 16) -- exactly
 * where `SidebarLatch` sits. The panel therefore unfolds *around* the logo
 * instead of appearing beside it, and the logo itself never moves.
 */
export const peekPanelClasses = cn(
  'transition-[left,right,width,top,bottom,border-radius,box-shadow] duration-300',
  'ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
  // `!` because the offcanvas rule parking the panel at -16rem has the same
  // specificity and would otherwise win on source order.
  'group-data-[panel=peek]/peek:left-2!',
  'group-data-[panel=peek]/peek:top-2 group-data-[panel=peek]/peek:bottom-2',
  'group-data-[panel=peek]/peek:h-auto group-data-[panel=peek]/peek:z-30',
  'group-data-[panel=peek]/peek:overflow-hidden group-data-[panel=peek]/peek:rounded-xl',
  // A ring, not a border: a 1px border would push the panel's own mark to
  // (17, 17) and the logo would twitch by a pixel as the panel unfolds.
  'group-data-[panel=peek]/peek:ring-1 group-data-[panel=peek]/peek:ring-hairline',
  'group-data-[panel=peek]/peek:shadow-[0_24px_64px_-16px_rgb(0_0_0/0.32)]'
);

/**
 * The live left edge: 16px of screen that arms the panel. It abuts the peeked
 * panel's own 8px inset, so rail → panel is one unbroken hover path with no
 * dead pixels between them.
 */
export function SidebarPeekRail() {
  const { open, isMobile } = useSidebar();
  const { peek, openPeek, stowPeek } = useSidebarPeek();

  if (isMobile || open) return null;

  return (
    <div
      aria-hidden
      onPointerEnter={(event) => event.pointerType === 'mouse' && openPeek()}
      onPointerLeave={(event) => event.pointerType === 'mouse' && stowPeek()}
      className={cn('group/rail fixed inset-y-0 left-0 z-20 w-4')}
    >
      {/* One brass hairline, masked at both ends so it reads as an instrument
          mark rather than a border. Dark until approached, and it stands down
          once the panel itself is out -- the panel is the signal by then. */}
      <span
        className={cn(
          'bg-brass absolute inset-y-0 left-0 w-px transition-opacity duration-150 motion-reduce:transition-none',
          'mask-[linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]',
          peek ? 'opacity-0' : 'opacity-0 group-hover/rail:opacity-70'
        )}
      />
    </div>
  );
}

/**
 * The mark, rendered twice at the same screen position: once as the floating
 * latch while the panel is away, once inside the panel's header. Because both
 * mounts resolve to the same 36px rect at (16, 16), the panel appears to unfold
 * around a logo that never moves.
 *
 * One click target, one behaviour: while the panel is unpinned this pins it,
 * and once pinned it goes home -- so the pixel the pointer is already aiming at
 * always does the obvious next thing.
 */
export function SidebarMark({ className }: { className?: string }) {
  const { open, toggleSidebar } = useSidebar();
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={open ? 'Go home' : 'Open sidebar'}
      onClick={() => (open ? router.push('/') : toggleSidebar())}
      className={cn(
        'group/mark grid size-9 shrink-0 place-items-center rounded-lg',
        'focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none',
        className
      )}
    >
      <Image
        src="/favicon.svg"
        alt=""
        width={20}
        height={20}
        className={cn(
          'size-5 transition-opacity duration-150 motion-reduce:transition-none',
          !open && 'group-hover/mark:opacity-0'
        )}
      />
      {/* Only while unpinned, where the mark's job is to open the panel rather
          than to go home. */}
      {!open && (
        <PanelLeftIcon
          aria-hidden
          className="text-primary absolute size-4 opacity-0 transition-opacity duration-150 group-hover/mark:opacity-100 motion-reduce:transition-none"
        />
      )}
    </button>
  );
}

/**
 * The latch: the only thing on screen while the sidebar is stowed. Hovering it
 * brings the panel out around it. It stays mounted through the peek and the
 * panel simply covers it -- unmounting it would drop the pointer through a hole
 * in its own hover target.
 */
export function SidebarLatch() {
  const { open, isMobile } = useSidebar();
  const { peek, openPeek, stowPeek } = useSidebarPeek();

  if (isMobile || open) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onPointerEnter={(event) => event.pointerType === 'mouse' && openPeek()}
          onPointerLeave={(event) => event.pointerType === 'mouse' && stowPeek()}
          className="animate-in fade-in fixed top-4 left-4 z-30 duration-200"
        >
          <SidebarMark className="border-hairline bg-sidebar/85 hover:border-brass/60 border backdrop-blur-md" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" hidden={peek} className="flex items-center gap-2">
        <span>Open sidebar</span>
        <Kbd className="text-muted-foreground/70">
          <span className="text-xs">⌘</span>B
        </Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

export { useSidebarPeek };
