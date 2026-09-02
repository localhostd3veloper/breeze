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

export function SectionHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <motion.div variants={rise} className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="type-display mt-4 text-[clamp(1.9rem,4.6vw,3.1rem)]">{title}</h2>
      {lede && <p className="text-muted-foreground mt-4 leading-relaxed">{lede}</p>}
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

const outside: { label: string; detail: string; marker: string }[] = [
  {
    label: 'Web search',
    detail: 'Tavily, when a reply needs the live web',
    marker: 'Off by default',
  },
  { label: 'Tracing', detail: 'Langfuse, if you set the keys', marker: 'Unset by default' },
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
              {outside.map(({ label, detail, marker }) => (
                <li
                  key={label}
                  className="border-hairline flex items-start justify-between gap-4 border-t p-5 first:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0"
                >
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-sm font-medium">{label}</p>
                    <p className="readout text-muted-foreground mt-1 text-xs">{detail}</p>
                  </div>
                  <span className="border-brass/40 text-brass eyebrow shrink-0 border px-2 py-1">
                    {marker}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-muted-foreground/80 mt-10 max-w-xl text-sm leading-relaxed">
            Nothing else is called. Conversation titles are written by the same local model that
            writes the replies, not by a hosted one.
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/* Capabilities -- a hairline index, not a wall of rounded cards        */
/* ------------------------------------------------------------------ */

const capabilities: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Brain,
    title: 'Thinking, shown',
    description:
      'Watch the model reason before it answers. The chain of thought collapses out of the way once you have read it.',
  },
  {
    icon: Globe,
    title: 'Web search',
    description:
      'Switch it on for a reply that needs the live web. Sources come back cited. Off until you ask.',
  },
  {
    icon: ImageIcon,
    title: 'Images',
    description: 'Drop an image into the thread and the model reads it alongside your text.',
  },
  {
    icon: Edit3,
    title: 'Edit and replay',
    description:
      'Change a message you already sent and the thread runs again from that point. Regenerate any reply.',
  },
  {
    icon: Search,
    title: 'Search everything',
    description:
      'Find any past chat by title or by something said inside it. Matches are highlighted in place.',
  },
  {
    icon: Pin,
    title: 'Pin what matters',
    description: 'Keep the threads you are living in at the top of the sidebar.',
  },
  {
    icon: Wand2,
    title: 'Titles that write themselves',
    description:
      'Each thread is named after your first message. Rename or regenerate it from the sidebar.',
  },
  {
    icon: Download,
    title: 'Export as Markdown',
    description: 'Take any conversation out as a clean Markdown file. It is your transcript.',
  },
  {
    icon: Smartphone,
    title: 'Installs like an app',
    description:
      'Add Breeze to a phone or dock it in the taskbar. It runs from its own window against your own server.',
  },
  {
    icon: Layers,
    title: 'Any Ollama model',
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
        />

        <div className="mt-14 grid md:grid-cols-2">
          {capabilities.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              variants={rise}
              className={`rule-t group hover:bg-background flex gap-5 py-6 transition-colors md:px-6 ${
                i % 2 === 0 ? 'md:pl-0' : 'md:border-hairline md:border-l'
              }`}
            >
              <Icon
                className="text-primary mt-0.5 size-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
                strokeWidth={1.75}
              />
              <div>
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
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
  },
  {
    n: '02',
    title: 'Bring the app up',
    body: 'Next.js on the front, FastAPI behind it. Both read their config from one env file.',
    cmd: 'bun run dev',
  },
  {
    n: '03',
    title: 'Make an account',
    body: 'Accounts live in your own MongoDB. There is no tenant, no plan, and nobody else on the instance.',
    cmd: 'open localhost:3000',
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
        <SectionHead eyebrow="Setup" title="Three steps, in this order." />

        <ol className="mt-14 grid gap-px md:grid-cols-3">
          {steps.map(({ n, title, body, cmd }) => (
            <motion.li key={n} variants={rise} className="rule-t py-7 md:px-6 md:first:pl-0">
              <span className="readout text-brass text-xs">{n}</span>
              <h3 className="type-display mt-3 text-xl">{title}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{body}</p>
              <code className="readout bg-secondary text-foreground mt-5 inline-block px-2.5 py-1.5 text-xs">
                {cmd}
              </code>
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
