import { z } from 'zod';

/**
 * The `breeze-ui` spec grammar.
 *
 * Two rules govern every change here:
 *
 * 1. **Flat beats expressive.** Every optional field is another field the model
 *    can get wrong. Reliability is the feature; richness is not.
 * 2. **No recursion.** `tabs` holds *leaf* widgets only — one level, never
 *    tabs-inside-tabs. That keeps the whole union inferable (recursive zod needs
 *    hand-written types and defeats `discriminatedUnion`), removes an unbounded
 *    render-depth hazard, and spares a small model a nesting decision it has no
 *    good reason to make inside a chat message.
 *
 * Keep this file and `backend/genui_prompt.py` in lockstep. A grammar the prompt
 * does not describe is a grammar the model will not emit.
 */

const cellValue = z.union([z.string(), z.number(), z.boolean()]);

/* ---------------------------------------------------------------- chart ---- */

/**
 * Two shapes, deliberately:
 *   - `data`   — one unnamed series, `[{ name, value }]`. What a model reaches
 *                for first, and the common case.
 *   - `x` + `series` — multi-series, sharing one category axis.
 *
 * Exactly one must be present. Without the refine, a chart with neither passes
 * validation and the renderer gets nothing to draw.
 */
const chartSchema = z
  .object({
    type: z.literal('chart'),
    variant: z.enum(['bar', 'line', 'area', 'pie']),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    /** Axis unit suffix, e.g. "ms", "%", "GB". Rendered in the readout face. */
    unit: z.string().max(8).optional(),
    x: z.array(z.string()).optional(),
    series: z
      .array(
        z.object({
          name: z.string(),
          data: z.array(z.number()),
        })
      )
      .optional(),
    data: z.array(z.object({ name: z.string(), value: z.number() })).optional(),
    stacked: z.boolean().optional(),
  })
  .refine((c) => (c.data?.length ?? 0) > 0 || (c.series?.length ?? 0) > 0, {
    message: 'chart needs either `data` or `series`',
  })
  .refine((c) => !c.series || !!c.x, {
    message: '`series` requires `x` for the category axis',
  })
  .refine((c) => !c.series || c.series.every((s) => s.data.length === (c.x?.length ?? 0)), {
    message: 'every series must have one value per `x` category',
  })
  // A pie encodes parts of one whole; multi-series pie is meaningless.
  .refine((c) => c.variant !== 'pie' || !c.series, {
    message: 'pie takes `data`, not `series`',
  });

/* -------------------------------------------------------------- metrics ---- */

const metricsSchema = z.object({
  type: z.literal('metrics'),
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string(),
        value: z.union([z.string(), z.number()]),
        delta: z.union([z.string(), z.number()]).optional(),
        /**
         * Semantic, not decorative. `tone` drives an icon + label as well as
         * colour, because status must never be carried by colour alone.
         */
        tone: z.enum(['positive', 'negative', 'neutral']).optional(),
      })
    )
    .min(1)
    .max(6),
});

/* ----------------------------------------------------------------- card ---- */

const cardSchema = z.object({
  type: z.literal('card'),
  eyebrow: z.string().max(40).optional(),
  title: z.string(),
  body: z.string(),
  footer: z.string().optional(),
});

/* ---------------------------------------------------------------- table ---- */

const tableSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  columns: z.array(z.object({ key: z.string(), label: z.string() })).min(1),
  rows: z.array(z.record(z.string(), cellValue)),
  sortable: z.boolean().optional(),
});

/* ----------------------------------------------------------- comparison ---- */

const comparisonSchema = z
  .object({
    type: z.literal('comparison'),
    title: z.string().optional(),
    columns: z.array(z.string()).min(1),
    rows: z
      .array(
        z.object({
          name: z.string(),
          values: z.array(cellValue),
        })
      )
      .min(1),
  })
  // Ragged rows render as a broken grid. Reject them at the boundary instead.
  .refine((c) => c.rows.every((r) => r.values.length === c.columns.length), {
    message: 'every row must have one value per column',
  });

/* ----------------------------------------------------------------- tabs ---- */

/** Leaves only — see the no-recursion rule above. */
const leafSchema = z.discriminatedUnion('type', [metricsSchema, cardSchema, tableSchema]);

/**
 * `chart` and `comparison` carry `.refine()`, which makes them ZodEffects rather
 * than ZodObject, so `discriminatedUnion` cannot take them. A plain union over
 * [refined…, discriminated leaves] keeps both the refinements and fast
 * discrimination for the rest.
 */
const nestableSchema = z.union([chartSchema, comparisonSchema, leafSchema]);

const tabsSchema = z.object({
  type: z.literal('tabs'),
  label: z.string().max(40).optional(),
  items: z
    .array(
      z.object({
        label: z.string(),
        body: z.array(nestableSchema).min(1),
      })
    )
    .min(2)
    .max(6),
});

/* ----------------------------------------------------------------- root ---- */

export const genUiSchema = z.union([nestableSchema, tabsSchema]);

export type GenUiChart = z.infer<typeof chartSchema>;
export type GenUiMetrics = z.infer<typeof metricsSchema>;
export type GenUiCard = z.infer<typeof cardSchema>;
export type GenUiTable = z.infer<typeof tableSchema>;
export type GenUiComparison = z.infer<typeof comparisonSchema>;
export type GenUiTabs = z.infer<typeof tabsSchema>;

/** Anything renderable inside a tab panel. */
export type GenUiLeaf = z.infer<typeof nestableSchema>;
export type GenUiSpec = z.infer<typeof genUiSchema>;

export type ChartVariant = GenUiChart['variant'];

/** The fence language that carries a spec. */
export const GENUI_LANGUAGE = 'breeze-ui';

/**
 * Per-turn generative-UI routing, sent as the request's `genui` field.
 *
 * `auto` asks the backend router to decide; `on` skips the router and forces the
 * stronger model; `off` keeps the turn on the plain local prose path.
 */
export type GenUiMode = 'auto' | 'on' | 'off';
