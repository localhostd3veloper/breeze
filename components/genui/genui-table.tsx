'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { GenUiTable } from '@/lib/genui/schema';
import { cn } from '@/lib/utils';

import { GenUiFrame } from './genui-frame';

type Cell = string | number | boolean;

const isNumeric = (v: Cell | undefined) => typeof v === 'number';

function compare(a: Cell | undefined, b: Cell | undefined): number {
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function renderCell(v: Cell | undefined) {
  if (v === undefined || v === null) return <span className="text-muted-foreground">—</span>;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export function GenUiTableWidget({ spec }: { spec: GenUiTable }) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  /** A column is right-aligned when its data is numeric, not when the model says so. */
  const numericCols = useMemo(() => {
    const set = new Set<string>();
    for (const col of spec.columns) {
      const values = spec.rows.map((r) => r[col.key]).filter((v) => v !== undefined);
      if (values.length > 0 && values.every(isNumeric)) set.add(col.key);
    }
    return set;
  }, [spec.columns, spec.rows]);

  const rows = useMemo(() => {
    if (!sort) return spec.rows;
    const sorted = [...spec.rows].sort((a, b) => compare(a[sort.key], b[sort.key]));
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  }, [spec.rows, sort]);

  // Default to sortable: a table the reader cannot reorder is a screenshot.
  const sortable = spec.sortable !== false && spec.rows.length > 2;

  const toggle = (key: string) =>
    setSort((prev) =>
      prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }
    );

  return (
    <GenUiFrame eyebrow="TABLE" title={spec.title}>
      {/* Wide tables scroll inside their own container; the message column never
          scrolls horizontally. */}
      <div className="max-h-[26rem] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-card/80 sticky top-0 backdrop-blur">
            <tr>
              {spec.columns.map((col) => {
                const active = sort?.key === col.key;
                const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={cn(
                      'border-hairline border-b px-3 py-2 font-normal',
                      numericCols.has(col.key) ? 'text-right' : 'text-left'
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggle(col.key)}
                        className={cn(
                          'eyebrow hover:text-foreground inline-flex items-center gap-1 transition-colors',
                          numericCols.has(col.key) && 'flex-row-reverse',
                          active && 'text-foreground'
                        )}
                      >
                        {col.label}
                        <Icon className="size-3 shrink-0 opacity-60" aria-hidden />
                      </button>
                    ) : (
                      <span className="eyebrow">{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={spec.columns.length}
                  className="text-muted-foreground px-3 py-6 text-center text-xs"
                >
                  No rows
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-accent/40 transition-colors">
                  {spec.columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'border-hairline border-b px-3 py-2',
                        numericCols.has(col.key)
                          ? 'readout text-right tabular-nums'
                          : 'text-foreground/90'
                      )}
                    >
                      {renderCell(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GenUiFrame>
  );
}
