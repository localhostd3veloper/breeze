import { source } from '@/lib/source';

export type DocsPage = (typeof source)['$inferPage'];

export async function getLLMText(page: DocsPage): Promise<string> {
  const content = page.data.content ?? '';

  return `# ${page.data.title ?? page.url} (${page.url})

${content}`;
}
