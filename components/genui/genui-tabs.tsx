'use client';

import { useId } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GenUiTabs } from '@/lib/genui/schema';

import { GenUiLeafWidget } from './genui-leaf';

/**
 * Tabs hold leaf widgets only — never other tabs. The grammar enforces it, so
 * this renderer needs no depth guard.
 *
 * Nested widgets drop their own outer frame (`bare`) so a tab panel does not
 * read as a box inside a box.
 */
export function GenUiTabsWidget({ spec }: { spec: GenUiTabs }) {
  const uid = useId();

  return (
    <div className="border-hairline bg-card/60 my-3 w-full overflow-hidden rounded-lg border">
      {spec.label && (
        <div className="border-hairline eyebrow border-b px-4 pt-3 pb-2.5">{spec.label}</div>
      )}
      <Tabs defaultValue={`${uid}-0`} className="gap-0">
        <TabsList variant="line" className="border-hairline w-full justify-start border-b px-2">
          {spec.items.map((item, i) => (
            <TabsTrigger key={i} value={`${uid}-${i}`} className="text-xs">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {spec.items.map((item, i) => (
          <TabsContent
            key={i}
            value={`${uid}-${i}`}
            // Strip the nested frame's own border and ground: the tab panel is
            // already a box, and a box inside a box reads as a mistake. Done as
            // a descendant rule rather than a `bare` prop so leaf widgets stay
            // unaware of where they are rendered.
            className="px-1 pb-1 [&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0 [&_figure]:bg-transparent"
          >
            {item.body.map((leaf, j) => (
              <GenUiLeafWidget key={j} spec={leaf} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
