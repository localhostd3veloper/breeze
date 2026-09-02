import { withContentCollections } from '@content-collections/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Plain-text source of any docs page, for LLMs and for the "Copy
      // Markdown" action. Both suffixes are accepted: `.mdx` is what Fumadocs
      // links to, `.md` is what people type.
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
      {
        source: '/docs/:path*.md',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withContentCollections(nextConfig);
