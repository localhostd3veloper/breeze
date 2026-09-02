import { GlassLayout } from 'fumadocs-ui/layouts/glass';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // `theme` stays disabled: the root layout already mounts next-themes, and a
    // second provider would fight it over the `class` attribute.
    <RootProvider theme={{ enabled: false }}>
      <GlassLayout {...baseOptions()} tree={source.getPageTree()}>
        {children}
      </GlassLayout>
    </RootProvider>
  );
}
