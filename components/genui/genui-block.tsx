'use client';

import { ChevronDown } from 'lucide-react';
import { memo, useMemo, useState } from 'react';

import { parseGenUiSpec } from '@/lib/genui/parse';

import { GenUiLeafWidget } from './genui-leaf';
import { GenUiTabsWidget } from './genui-tabs';

/**
 * Placeholder shown while the fence is still arriving.
 *
 * Sized close to a real widget so the message does not jump when the spec
 * resolves — the point of the skeleton is that the widget *settles*, not that
 * it appears.
 */
function GenUiSkeleton() {
  return (
    <div
      className="border-hairline bg-card/60 my-3 w-full animate-pulse rounded-lg border"
      aria-busy="true"
      aria-label="Building view"
    >
      <div className="border-hairline border-b px-4 pt-3 pb-2.5">
        <div className="bg-muted h-2 w-16 rounded-sm" />
        <div className="bg-muted mt-2 h-3 w-40 rounded-sm" />
      </div>
      <div className="flex h-[180px] items-end gap-2 px-4 pt-4 pb-4">
        {[38, 62, 45, 78, 55, 70].map((h, i) => (
          <div key={i} className="bg-muted flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Shown when a spec is genuinely invalid rather than merely unfinished.
 *
 * Deliberately quiet and collapsed: a malformed widget is a small imperfection
 * in an otherwise useful answer, not an application error. The raw JSON stays
 * available because that is what makes the failure diagnosable.
 */
function GenUiError({ error, raw }: { error: string; raw: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-hairline bg-card/40 my-3 w-full overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-accent/40 flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors"
      >
        <ChevronDown
          className={`text-muted-foreground size-3.5 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
          aria-hidden
        />
        <span className="eyebrow">VIEW UNAVAILABLE</span>
        <span className="text-muted-foreground truncate text-xs">{error}</span>
      </button>
      {open && (
        <pre className="border-hairline text-muted-foreground max-h-64 overflow-auto border-t px-4 py-3 font-mono text-xs whitespace-pre-wrap">
          {raw}
        </pre>
      )}
    </div>
  );
}

/**
 * Renders the body of one ```breeze-ui fence.
 *
 * `isIncomplete` comes from Streamdown, which knows the fence has not closed
 * yet. The parser independently detects a truncated prefix, so a widget still
 * settles correctly if that signal is unavailable.
 */
export const GenUiBlock = memo(function GenUiBlock({
  raw,
  isIncomplete,
}: {
  raw: string;
  isIncomplete?: boolean;
}) {
  const result = useMemo(() => parseGenUiSpec(raw), [raw]);

  if (!result.ok) {
    if (isIncomplete || result.incomplete) return <GenUiSkeleton />;
    return <GenUiError error={result.error} raw={raw} />;
  }

  return result.spec.type === 'tabs' ? (
    <GenUiTabsWidget spec={result.spec} />
  ) : (
    <GenUiLeafWidget spec={result.spec} />
  );
});
