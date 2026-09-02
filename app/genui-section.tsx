'use client';

import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { group, rise, SectionHead, viewport } from './landing-sections';

/* ------------------------------------------------------------------ */
/* Signature: the reading                                              */
/*                                                                     */
/* A weather station takes numbers and renders them on a dial. That is  */
/* exactly what this feature does, so the section shows the real spec   */
/* beside the real widget it produces -- rendered by the same component  */
/* the chat uses, not a screenshot. The mechanism IS the argument, the  */
/* way the boundary diagram is the argument above it.                   */
/* ------------------------------------------------------------------ */

/**
 * Recharts is heavy and this is the landing page. Loading the renderer after
 * paint keeps it out of the first bundle; the placeholder holds the height so
 * nothing jumps when it arrives.
 */
const GenUiBlock = dynamic(
  () => import('@/components/genui/genui-block').then((m) => m.GenUiBlock),
  {
    ssr: false,
    loading: () => (
      <div
        className="border-hairline bg-card/40 h-62 animate-pulse rounded-lg border"
        aria-hidden
      />
    ),
  }
);

/** Each example is one real question and the one spec that answered it. */
const EXAMPLES = [
  {
    key: 'trend',
    label: 'A trend',
    asked: 'How did revenue move this year?',
    spec: `{
  "type": "chart",
  "variant": "line",
  "title": "Monthly revenue",
  "unit": "k",
  "x": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "series": [
    { "name": "2026", "data": [8.2, 8.6, 9.4, 10.1, 11.8, 13.2] },
    { "name": "2025", "data": [7.1, 7.4, 7.9, 8.2, 8.6, 9.0] }
  ]
}`,
  },
  {
    key: 'split',
    label: 'A split',
    asked: 'Where did the budget actually go?',
    spec: `{
  "type": "chart",
  "variant": "pie",
  "title": "Spend by category",
  "data": [
    { "name": "Rent", "value": 2400 },
    { "name": "Payroll", "value": 5100 },
    { "name": "Stock", "value": 1850 },
    { "name": "Utilities", "value": 620 }
  ]
}`,
  },
  {
    key: 'options',
    label: 'Some options',
    asked: 'Compare the three plans.',
    spec: `{
  "type": "table",
  "title": "Plans",
  "columns": [
    { "key": "plan", "label": "Plan" },
    { "key": "seats", "label": "Seats" },
    { "key": "gb", "label": "Storage GB" },
    { "key": "sso", "label": "SSO" }
  ],
  "rows": [
    { "plan": "Starter", "seats": 3, "gb": 10, "sso": false },
    { "plan": "Team", "seats": 25, "gb": 250, "sso": true },
    { "plan": "Studio", "seats": 100, "gb": 2000, "sso": true }
  ]
}`,
  },
  {
    key: 'reading',
    label: 'A reading',
    asked: 'How did last week go?',
    spec: `{
  "type": "metrics",
  "title": "Last 7 days",
  "items": [
    { "label": "Signups", "value": "1,284",
      "delta": "+12%", "tone": "positive" },
    { "label": "Response time", "value": "412 ms",
      "delta": "+38 ms", "tone": "negative" },
    { "label": "Uptime", "value": "99.98%",
      "delta": "no change", "tone": "neutral" }
  ]
}`,
  },
  {
    key: 'shortlist',
    label: 'Side by side',
    asked: 'Which one should I pick?',
    spec: `{
  "type": "comparison",
  "title": "Shortlist",
  "columns": ["Price", "Battery", "Backlit keys"],
  "rows": [
    { "name": "Model A", "values": ["899", "11 h", true] },
    { "name": "Model B", "values": ["1,199", "17 h", true] },
    { "name": "Model C", "values": ["749", "8 h", false] }
  ]
}`,
  },
  {
    key: 'note',
    label: 'A caveat',
    asked: 'Anything I should watch out for?',
    spec: `{
  "type": "card",
  "eyebrow": "Watch out",
  "title": "The deposit is non-refundable",
  "body": "Cancelling after the 14-day window forfeits the full 20% deposit, not a pro-rated share of it. The contract calls this a reservation fee rather than a deposit, which is why it is easy to miss.",
  "footer": "Clause 7.2"
}`,
  },
  {
    key: 'grouped',
    label: 'In tabs',
    asked: 'Break the quarter down for me.',
    spec: `{
  "type": "tabs",
  "label": "By quarter",
  "items": [
    {
      "label": "Revenue",
      "body": [
        {
          "type": "chart",
          "variant": "bar",
          "unit": "k",
          "data": [
            { "name": "Q1", "value": 26.2 },
            { "name": "Q2", "value": 35.1 },
            { "name": "Q3", "value": 31.8 }
          ]
        }
      ]
    },
    {
      "label": "Detail",
      "body": [
        {
          "type": "table",
          "columns": [
            { "key": "q", "label": "Quarter" },
            { "key": "rev", "label": "Revenue k" },
            { "key": "orders", "label": "Orders" }
          ],
          "rows": [
            { "q": "Q1", "rev": 26.2, "orders": 812 },
            { "q": "Q2", "rev": 35.1, "orders": 1094 },
            { "q": "Q3", "rev": 31.8, "orders": 967 }
          ]
        }
      ]
    }
  ]
}`,
  },
] as const;

export function GenerativeUISection() {
  const [active, setActive] = useState(0);
  const example = EXAMPLES[active];

  return (
    <motion.section
      variants={group(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="rule-t"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <SectionHead
          eyebrow="Generative UI"
          title="Some answers are better drawn."
          lede="When a reply is really a trend, a table or a shortlist, Breeze writes the numbers for one and the app draws it. Every example below is a live widget, not a picture -- pick one to see the spec that produced it."
          link={{ href: '/docs/generative-ui', label: 'How the grammar works' }}
        />

        <motion.div variants={rise} className="mt-14">
          {/* Example switcher. User-triggered, so the section still has exactly
              one automatic reveal -- the page's shared `rise`. */}
          <div
            role="tablist"
            aria-label="Examples"
            className="border-hairline flex flex-wrap gap-6 border-b"
          >
            {EXAMPLES.map((ex, i) => (
              <button
                key={ex.key}
                role="tab"
                type="button"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`eyebrow -mb-px border-b py-3 transition-colors ${
                  i === active
                    ? 'border-primary text-foreground'
                    : 'hover:text-foreground border-transparent'
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>

          <p className="readout text-muted-foreground mt-6 text-sm">
            You asked: <span className="text-foreground">{example.asked}</span>
          </p>

          <div className="border-hairline mt-4 grid border md:grid-cols-2">
            {/* Left: what the model actually types. The fence delimiters are
                shown because they are genuinely part of what it writes. */}
            <div className="bg-secondary/40 min-w-0 p-5">
              <p className="eyebrow">What the model writes</p>
              <pre className="text-muted-foreground mt-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                <code>
                  <span className="text-primary">```breeze-ui</span>
                  {'\n'}
                  {example.spec}
                  {'\n'}
                  <span className="text-primary">```</span>
                </code>
              </pre>
            </div>

            {/* Right: the same string, run through the renderer the chat uses. */}
            <div className="border-hairline min-w-0 border-t p-5 md:border-t-0 md:border-l">
              <p className="eyebrow">What you see</p>
              <div className="mt-1">
                <GenUiBlock key={example.key} raw={example.spec} />
              </div>
            </div>
          </div>

          <p className="text-muted-foreground mt-6 max-w-2xl text-sm leading-relaxed">
            The model fills in a form the app already knows how to draw. Every spec is checked
            against a fixed list of widgets first, an unrecognised one shows as plain text, and no
            part of a reply is ever run as code.
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
