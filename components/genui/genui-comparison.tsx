'use client';

import { Check, Minus, X } from 'lucide-react';

import type { GenUiComparison } from '@/lib/genui/schema';
import { cn } from '@/lib/utils';

import { GenUiFrame } from './genui-frame';

/**
 * Booleans get an icon *and* a screen-reader label — a bare tick relies on shape
 * alone, which is the same mistake as relying on colour alone.
 */
function BoolCell({ value }: { value: boolean }) {
  const Icon = value ? Check : X;
  return (
    <span className={cn('inline-flex', value ? 'text-primary' : 'text-muted-foreground/60')}>
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{value ? 'yes' : 'no'}</span>
    </span>
  );
}

export function GenUiComparisonWidget({ spec }: { spec: GenUiComparison }) {
  return (
    <GenUiFrame eyebrow="COMPARISON" title={spec.title}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-hairline border-b px-3 py-2 text-left">
                <span className="sr-only">Item</span>
              </th>
              {spec.columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="border-hairline eyebrow border-b px-3 py-2 text-left"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, i) => (
              <tr key={i} className="hover:bg-accent/40 transition-colors">
                <th
                  scope="row"
                  className="border-hairline text-foreground border-b px-3 py-2 text-left font-medium"
                >
                  {row.name}
                </th>
                {row.values.map((v, j) => (
                  <td
                    key={j}
                    className={cn(
                      'border-hairline border-b px-3 py-2',
                      typeof v === 'number' ? 'readout tabular-nums' : 'text-foreground/90'
                    )}
                  >
                    {typeof v === 'boolean' ? (
                      <BoolCell value={v} />
                    ) : v === '' ? (
                      <Minus className="text-muted-foreground/60 size-4" aria-label="none" />
                    ) : (
                      String(v)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GenUiFrame>
  );
}
