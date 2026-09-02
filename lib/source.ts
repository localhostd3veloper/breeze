import { createMDXSource } from '@fumadocs/content-collections';
import { allDocs, allMetas } from 'content-collections';
import { loader } from 'fumadocs-core/source';

import { iconResolver } from '@/lib/icons';

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(allDocs, allMetas),
  icon: iconResolver,
});
