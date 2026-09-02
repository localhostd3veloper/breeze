import { createFromSource } from 'fumadocs-core/search/server';

import { source } from '@/lib/source';

/**
 * Search index over the docs tree.
 *
 * `createFromSource` builds a flexsearch index from each page's
 * `structuredData` (headings + paragraph text), which `transformMDX` emits in
 * `content-collections.ts`. The `RootProvider` in `app/docs/layout.tsx` hits
 * this route by default -- no client configuration needed.
 */
export const { GET } = createFromSource(source);
