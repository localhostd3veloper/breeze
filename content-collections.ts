import { defineCollection, defineConfig } from '@content-collections/core';
import { transformMDX } from '@fumadocs/content-collections/configuration';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

/**
 * Attributes worth putting in the search index.
 *
 * `remark-structure` treats a self-closing JSX element like `<Card />` as one
 * content block and stringifies every attribute into it. Unfiltered, a search
 * for "streaming" surfaces the literal string
 * `<Card icon="<Terminal />" href="/docs/api" ... />`. Only the two attributes
 * that carry prose are useful as a search result.
 */
const INDEXED_MDX_ATTRIBUTES = new Set(['title', 'description']);

const docs = defineCollection({
  name: 'docs',
  directory: 'content/docs',
  include: '**/*.mdx',
  // `content` is declared explicitly: content-collections deprecated adding it
  // implicitly, and `transformMDX` requires it. `getLLMText` reads it too, for
  // the `.md` / `.mdx` plain-text routes.
  schema: pageSchema.extend({ content: z.string() }),
  transform: (document, context) =>
    transformMDX(document, context, {
      remarkStructureOptions: {
        stringify: {
          filterMdxAttributes: (_node, attribute) =>
            attribute.type === 'mdxJsxAttribute' && INDEXED_MDX_ATTRIBUTES.has(attribute.name),
        },
      },
    }),
});

const metas = defineCollection({
  name: 'meta',
  directory: 'content/docs',
  include: '**/meta.json',
  parser: 'json',
  schema: metaSchema,
});

export default defineConfig({
  content: [docs, metas],
});
