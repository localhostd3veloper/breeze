'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import type { GenUiMetrics } from '@/lib/genui/schema';
import { cn } from '@/lib/utils';

import { GenUiFrame, GenUiStagger } from './genui-frame';

/**
 * Tone ships an icon and an accessible label alongside the colour, never colour
 * alone. Brass is deliberately absent: in Station it means egress, and spending
 * it on "number went down" would dilute the one signal it carries.
 */
const TONE = {
  positive: { icon: ArrowUpRight, className: 'text-primary', label: 'up' },
  negative: { icon: ArrowDownRight, className: 'text-destructive', label: 'down' },
  neutral: { icon: Minus, className: 'text-muted-foreground', label: 'flat' },
} as const;

export function GenUiMetricsWidget({ spec }: { spec: GenUiMetrics }) {
  const cols = Math.min(spec.items.length, 3);

  return (
    <GenUiFrame eyebrow="READINGS" title={spec.title}>
      <div
        className="grid divide-x divide-y"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          borderColor: 'var(--hairline)',
        }}
      >
        {spec.items.map((item, i) => {
          const tone = item.tone ? TONE[item.tone] : null;
          const Icon = tone?.icon;

          return (
            <GenUiStagger key={i} index={i} className="border-hairline min-w-0 px-4 py-3">
              <div className="eyebrow truncate" title={item.label}>
                {item.label}
              </div>
              <div className="type-display text-foreground mt-1.5 text-2xl tabular-nums">
                {item.value}
              </div>
              {item.delta !== undefined && (
                <div
                  className={cn(
                    'readout mt-1 flex items-center gap-1 text-xs tabular-nums',
                    tone?.className ?? 'text-muted-foreground'
                  )}
                >
                  {Icon && <Icon className="size-3 shrink-0" aria-hidden />}
                  <span>{item.delta}</span>
                  {tone && <span className="sr-only">{tone.label}</span>}
                </div>
              )}
            </GenUiStagger>
          );
        })}
      </div>
    </GenUiFrame>
  );
}
