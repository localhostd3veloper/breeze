'use client';

import type { GenUiCard } from '@/lib/genui/schema';

import { GenUiFrame } from './genui-frame';

export function GenUiCardWidget({ spec }: { spec: GenUiCard }) {
  return (
    <GenUiFrame eyebrow={spec.eyebrow ?? 'NOTE'} title={spec.title} footer={spec.footer}>
      {/* Body is plain text by contract, not markdown: the fence carries data,
          and re-entering the markdown renderer here would reopen the door the
          JSON-only grammar exists to close. */}
      <p className="text-foreground/90 px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
        {spec.body}
      </p>
    </GenUiFrame>
  );
}
