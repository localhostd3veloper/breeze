import { MDXContent } from '@content-collections/mdx/react';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/glass/page';
import { notFound } from 'next/navigation';

import { getMDXComponents } from '@/components/mdx';
import { REPO_URL } from '@/lib/layout.shared';
import { source } from '@/lib/source';

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: Props) {
  const { slug = [] } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  // Served by the `/docs/:path*.mdx` rewrite in `next.config.ts`, which points
  // at the `llms.mdx` route handler.
  const markdownUrl = `${page.url}.mdx`;
  const githubUrl = `${REPO_URL}/blob/main/content/docs/${page.path}`;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="mb-6 flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <MDXContent code={page.data.body} components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props) {
  const { slug = [] } = await params;
  const page = source.getPage(slug);
  if (!page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
