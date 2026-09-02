'use client';

import {
  ArrowRight,
  Brain,
  Download,
  Edit3,
  Globe,
  HardDrive,
  ImageIcon,
  Layers,
  type LucideIcon,
  MessageSquare,
  Pin,
  Search,
  Smartphone,
  User,
  Wand2,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/* Motion: one reveal, used everywhere. Fires once -- a section that     */
/* re-animates every time you scroll past it is noise, not motion.      */
/* ------------------------------------------------------------------ */

export const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export const group = (stagger = 0.06) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

export const viewport = { once: true, margin: '-60px' } as const;

/** The one way a section points at the page that documents it. */
export function DocsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-primary eyebrow group/link hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
    >
      {children}
      <ArrowRight className="size-3.5 transition-transform group-hover/link:translate-x-0.5" />
    </Link>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  link,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  /** Sends the reader to the page that documents this section in full. */
  link?: { href: string; label: string };
}) {
  return (
    <motion.div variants={rise} className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="type-display mt-4 text-[clamp(1.9rem,4.6vw,3.1rem)]">{title}</h2>
      {lede && <p className="text-muted-foreground mt-4 leading-relaxed">{lede}</p>}
      {link && (
        <p className="mt-6">
          <DocsLink href={link.href}>{link.label}</DocsLink>
        </p>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Signature: the boundary                                             */
/*                                                                     */
/* Every claim here is checked against the code. Inference and title    */
/* summarisation both hit the Ollama client (backend/app.py), search is */
/* Tavily and defaults to off (components/Input.tsx), and Langfuse only */
/* traces when its keys are set.                                       */
/* ------------------------------------------------------------------ */

type Node = { icon: LucideIcon; label: string; detail: string };

const inside: Node[] = [
  { icon: User, label: 'You', detail: 'browser' },
  { icon: MessageSquare, label: 'Breeze', detail: 'Next.js + FastAPI' },
  { icon: Brain, label: 'The model', detail: 'Ollama · :11434' },
  { icon: HardDrive, label: 'Transcripts', detail: 'your MongoDB' },
];

const outside: { label: string; detail: string; marker: string; href: string }[] = [
  {
    label: 'Web search',
    detail: 'Tavily, when a reply needs the live web',
    marker: 'Off by default',
    href: '/docs/web-search',
  },
  {
    label: 'Tracing',
    detail: 'Langfuse, if you set the keys',
    marker: 'Unset by default',
    href: '/docs/langfuse',
  },
];

export function BoundarySection() {
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
          eyebrow="The boundary"
          title="Here is exactly what leaves."
          lede="Most private-AI pages ask you to take their word for it. This is the whole map -- every part of Breeze, drawn on the honest side of the line."
        />

        <motion.div variants={rise} className="mt-16">
          {/* ---- Inside ---- */}
          <div className="border-hairline bg-card/60 relative border">
            <span className="bg-background eyebrow text-foreground absolute -top-[7px] left-5 px-2">
              Your machine
            </span>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
              {inside.map(({ icon: Icon, label, detail }) => (
                <li
                  key={label}
                  className="border-hairline flex items-start gap-3 border-t p-5 first:border-t-0 lg:border-t-0 lg:border-l lg:first:border-l-0 sm:[&:nth-child(-n+2)]:border-t-0"
                >
                  <Icon className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="readout text-muted-foreground mt-1 text-xs">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- The crossing ---- */}
          {/* One wire leaves the box. Drawing it is the whole argument. */}
          <div className="relative flex flex-col items-center">
            <span aria-hidden className="border-brass/60 h-10 border-l border-dashed sm:h-12" />
            <div className="boundary w-full" />
            <p className="eyebrow text-brass bg-background -mt-[7px] px-3">
              Crossed only when you switch it on
            </p>
            <span
              aria-hidden
              className="border-brass/60 mt-1 h-10 border-l border-dashed sm:h-12"
            />
          </div>

          {/* ---- Outside ---- */}
          <div className="border-hairline relative border border-dashed">
            <span className="bg-background eyebrow text-muted-foreground absolute -top-[7px] left-5 px-2">
              The internet
            </span>
            <ul className="grid sm:grid-cols-2">
              {outside.map(({ label, detail, marker, href }) => (
                <li
                  key={label}
                  className="border-hairline border-t first:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0"
                >
                  {/* Each crossing links to the page that explains exactly
                      what it sends and how to turn it off. */}
                  <Link
                    href={href}
                    className="group hover:bg-card/60 flex items-start justify-between gap-4 p-5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-muted-foreground group-hover:text-foreground text-sm font-medium transition-colors">
                        {label}
                        <ArrowRight
                          aria-hidden
                          className="ml-1.5 inline size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </p>
                      <p className="readout text-muted-foreground mt-1 text-xs">{detail}</p>
                    </div>
                    <span className="border-brass/40 text-brass eyebrow shrink-0 border px-2 py-1">
                      {marker}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 max-w-xl">
            <p className="text-muted-foreground/80 text-sm leading-relaxed">
              Nothing else is called. Conversation titles are written by the same local model that
              writes the replies, not by a hosted one.
            </p>
            <p className="mt-5">
              <DocsLink href="/docs/security">Read the security guarantees</DocsLink>
            </p>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/* Capabilities -- a hairline index, not a wall of rounded cards        */
/* ------------------------------------------------------------------ */

const capabilities: { icon: LucideIcon; title: string; description: string; href: string }[] = [
  {
    icon: Brain,
    title: 'Thinking, shown',
    href: '/docs/features#thinking',
    description:
      'Watch the model reason before it answers. The chain of thought collapses out of the way once you have read it.',
  },
  {
    icon: Globe,
    title: 'Web search',
    href: '/docs/web-search',
    description:
      'Switch it on for a reply that needs the live web. Sources come back cited. Off until you ask.',
  },
  {
    icon: ImageIcon,
    title: 'Images',
    href: '/docs/features#images',
    description: 'Drop an image into the thread and the model reads it alongside your text.',
  },
  {
    icon: Edit3,
    title: 'Edit and replay',
    href: '/docs/features#in-the-transcript',
    description:
      'Change a message you already sent and the thread runs again from that point. Regenerate any reply.',
  },
  {
    icon: Search,
    title: 'Search everything',
    href: '/docs/features#conversation-management',
    description:
      'Find any past chat by title or by something said inside it. Matches are highlighted in place.',
  },
  {
    icon: Pin,
    title: 'Pin what matters',
    href: '/docs/features#conversation-management',
    description: 'Keep the threads you are living in at the top of the sidebar.',
  },
  {
    icon: Wand2,
    title: 'Titles that write themselves',
    href: '/docs/features#conversation-management',
    description:
      'Each thread is named after your first message. Rename or regenerate it from the sidebar.',
  },
  {
    icon: Download,
    title: 'Export as Markdown',
    href: '/docs/features#in-the-transcript',
    description: 'Take any conversation out as a clean Markdown file. It is your transcript.',
  },
  {
    icon: Smartphone,
    title: 'Installs like an app',
    href: '/docs/getting-started',
    description:
      'Add Breeze to a phone or dock it in the taskbar. It runs from its own window against your own server.',
  },
  {
    icon: Layers,
    title: 'Any Ollama model',
    href: '/docs/architecture#model-selection',
    description: 'Swap models in one config file. If Ollama can pull it, Breeze can talk to it.',
  },
];

export function CapabilitiesSection() {
  return (
    <motion.section
      variants={group(0.05)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="rule-t bg-card/30"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <SectionHead
          eyebrow="Instruments"
          title="Everything you reach for, and nothing you don't."
          link={{ href: '/docs/features', label: 'The full feature guide' }}
        />

        <div className="mt-14 grid md:grid-cols-2">
          {capabilities.map(({ icon: Icon, title, description, href }, i) => (
            <motion.div
              key={title}
              variants={rise}
              className={`rule-t ${i % 2 === 0 ? 'md:pl-0' : 'md:border-hairline md:border-l'}`}
            >
              {/* The whole row is the target -- an index entry that reads as
                  prose but behaves like a link to the page documenting it. */}
              <Link
                href={href}
                className="group hover:bg-background flex gap-5 py-6 transition-colors md:px-6"
              >
                <Icon
                  className="text-primary mt-0.5 size-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
                  strokeWidth={1.75}
                />
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    {title}
                    <ArrowRight
                      aria-hidden
                      className="ml-1.5 inline size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/* Setup -- the one place numbering earns itself, because order matters */
/* ------------------------------------------------------------------ */

const steps = [
  {
    n: '01',
    title: 'Pull a model',
    body: 'Point Breeze at any Ollama instance you can reach. Local machine, home server, the box under the desk.',
    cmd: 'ollama pull qwen3',
    href: '/docs/getting-started#pull-the-models',
  },
  {
    n: '02',
    title: 'Bring the app up',
    body: 'Next.js on the front, FastAPI behind it. Both read their config from one env file.',
    cmd: 'bun run dev',
    href: '/docs/getting-started#install-the-frontend',
  },
  {
    n: '03',
    title: 'Make an account',
    body: 'Accounts live in your own MongoDB. There is no tenant, no plan, and nobody else on the instance.',
    cmd: 'open localhost:3000',
    href: '/docs/getting-started#verify',
  },
];

export function SetupSection() {
  return (
    <motion.section
      variants={group(0.1)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="rule-t"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <SectionHead
          eyebrow="Setup"
          title="Three steps, in this order."
          link={{ href: '/docs/getting-started', label: 'Full installation guide' }}
        />

        <ol className="mt-14 grid gap-px md:grid-cols-3">
          {steps.map(({ n, title, body, cmd, href }) => (
            <motion.li key={n} variants={rise} className="rule-t md:first:pl-0">
              {/* Each step opens the same step, written out in full. */}
              <Link href={href} className="group block py-7 md:px-6">
                <span className="readout text-brass text-xs">{n}</span>
                <h3 className="type-display group-hover:text-primary mt-3 text-xl transition-colors">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{body}</p>
                <code className="readout bg-secondary text-foreground mt-5 inline-block px-2.5 py-1.5 text-xs">
                  {cmd}
                </code>
              </Link>
            </motion.li>
          ))}
        </ol>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/* Shortcuts                                                           */
/* ------------------------------------------------------------------ */

const shortcuts = [
  { keys: ['⌘', 'K'], label: 'Search conversations' },
  { keys: ['⌘', 'B'], label: 'Toggle the sidebar' },
  { keys: ['⌘', '⇧', 'O'], label: 'Start a new chat' },
];

export function ShortcutsSection() {
  return (
    <motion.section
      variants={group(0.07)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="rule-t bg-card/30"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-20 sm:px-8 md:flex-row md:items-end md:justify-between">
        <motion.div variants={rise} className="max-w-sm">
          <p className="eyebrow">Controls</p>
          <h2 className="type-display mt-4 text-[clamp(1.7rem,3.6vw,2.4rem)] text-balance">
            Hands stay on the keys.
          </h2>
        </motion.div>

        <motion.ul variants={group(0.07)} className="flex flex-wrap gap-x-10 gap-y-6">
          {shortcuts.map(({ keys, label }) => (
            <motion.li key={label} variants={rise} className="flex flex-col gap-2.5">
              <span className="flex items-center gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="border-hairline bg-background readout text-foreground inline-flex h-7 min-w-7 items-center justify-center border px-2 text-xs"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/* Close                                                               */
/* ------------------------------------------------------------------ */

export function CTASection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <motion.section
      variants={group(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="rule-t"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <motion.div variants={rise} className="max-w-2xl">
          <p className="eyebrow">Take it home</p>
          <h2 className="type-display mt-4 text-[clamp(2rem,5.4vw,3.6rem)]">
            Run it on your own hardware.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-lg leading-relaxed">
            Clone it, point it at your model, and the whole thing is yours -- transcripts, accounts,
            and the machine doing the thinking.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2 rounded-none px-7">
              <Link href={isLoggedIn ? '/chat' : '/signup'}>
                {isLoggedIn ? 'Open Breeze' : 'Start chatting'} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-none px-7">
              <Link href="/docs/getting-started">Read the docs</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-none px-7">
              <Link
                href="https://github.com/localhostd3veloper/breeze"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the source
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
