'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Reduced motion is applied to the *transition*, never to `initial`.
 *
 * `useReducedMotion()` cannot know the user's preference during SSR, so it
 * always reports false there. Branching `initial` on it therefore makes the
 * server emit `opacity: 0` while a reduced-motion client emits `opacity: 1` —
 * a hydration mismatch on every widget, for exactly the users least served by
 * being ignored. Holding `initial` constant and collapsing the duration to zero
 * gives those users no movement and keeps both renders identical.
 */
const ENTER = { opacity: 0, y: 6 };
const SETTLED = { opacity: 1, y: 0 };

export function GenUiFrame({
  eyebrow,
  title,
  subtitle,
  footer,
  className,
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const hasHead = Boolean(eyebrow || title || subtitle);

  return (
    <motion.figure
      // One entrance transition, then nothing. Never loops.
      initial={ENTER}
      animate={SETTLED}
      transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        'border-hairline bg-card/60 my-3 w-full overflow-hidden rounded-lg border',
        className
      )}
    >
      {hasHead && (
        <figcaption className="border-hairline border-b px-4 pt-3 pb-2.5">
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          {title && <div className="text-foreground text-sm font-medium">{title}</div>}
          {subtitle && <div className="text-muted-foreground mt-0.5 text-xs">{subtitle}</div>}
        </figcaption>
      )}
      {children}
      {footer && (
        <div className="border-hairline text-muted-foreground border-t px-4 py-2 text-xs">
          {footer}
        </div>
      )}
    </motion.figure>
  );
}

/**
 * Staggers children by ~40ms. Used for tile rows so a widget assembles rather
 * than snapping in all at once. Same SSR-safe reduced-motion handling as above.
 */
export function GenUiStagger({
  index,
  children,
  className,
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={ENTER}
      animate={SETTLED}
      transition={reduce ? { duration: 0 } : { duration: 0.24, delay: Math.min(index, 8) * 0.04 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
