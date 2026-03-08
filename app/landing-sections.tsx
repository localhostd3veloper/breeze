'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  Lock,
  Zap,
  Server,
  Shield,
  Sparkles,
  Pin,
  Download,
  Search,
  Keyboard,
  Globe,
  Brain,
  ImageIcon,
  Edit3,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const coreFeatures: { icon: LucideIcon; title: string; description: string }[] =
  [
    {
      icon: Lock,
      title: 'Fully Private',
      description:
        'Your conversations never leave your infrastructure. No telemetry, no data collection, no cloud dependencies.',
    },
    {
      icon: Zap,
      title: 'Blazing Fast',
      description:
        'Streaming responses with minimal latency. Runs on your own hardware so performance scales with you.',
    },
    {
      icon: Server,
      title: 'Self-Hosted',
      description:
        'Deploy on your own server or locally via Ollama. You own the stack — models, data, and all.',
    },
  ];

const powerFeatures: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Brain,
    title: 'Advanced Thinking Mode',
    description:
      'Watch the model reason step-by-step with a collapsible chain-of-thought for full transparency.',
  },
  {
    icon: Globe,
    title: 'Live Web Search',
    description:
      'Give the model real-time context with toggle-on web search. Sources are automatically cited.',
  },
  {
    icon: ImageIcon,
    title: 'Image Uploads',
    description:
      'Drag and drop images into any conversation. The model sees and analyzes them instantly.',
  },
  {
    icon: Edit3,
    title: 'Edit & Regenerate',
    description:
      'Edit any past message and replay the thread. Regenerate responses until you get the perfect answer.',
  },
  {
    icon: Pin,
    title: 'Pin Conversations',
    description:
      'Keep your most important chats pinned at the top. Never lose track of ongoing work.',
  },
  {
    icon: Download,
    title: 'Export to Markdown',
    description:
      'Download any conversation as a clean Markdown file. One click, done.',
  },
  {
    icon: Search,
    title: 'Search Conversations',
    description:
      'Instantly surface any past chat with fuzzy search across your entire history.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard Shortcuts',
    description:
      'Stay in the flow with power-user shortcuts for every action that matters.',
  },
  {
    icon: Sparkles,
    title: 'Buttery Animations',
    description:
      "Every interaction is smooth and purposeful — more polished than any chat platform you've used.",
  },
  {
    icon: Wand2,
    title: 'Smart Conversation Titles',
    description:
      'Titles are auto-generated after your first message. Regenerate anytime from the sidebar to keep things organized.',
  },
];

const shortcuts = [
  { keys: ['⌘', 'K'], label: 'Search conversations' },
  { keys: ['⌘', 'B'], label: 'Toggle sidebar' },
  { keys: ['⌘', '⇧', 'O'], label: 'New chat' },
];

const steps = [
  {
    number: '01',
    title: 'Sign in',
    description: 'Create an account on your private Breeze instance.',
  },
  {
    number: '02',
    title: 'Pick a model',
    description:
      'Choose from any Ollama-compatible LLM running on your server.',
  },
  {
    number: '03',
    title: 'Start chatting',
    description: 'Ask anything. Your data stays yours, always.',
  },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

const staggerContainer = (stagger = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

const viewport = { once: false, margin: '-80px' } as const;

// ─── Shared heading block ────────────────────────────────────────────────────

function SectionHeading({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      className="mb-14 text-center"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Badge variant="secondary" className="mb-4">
        {badge}
      </Badge>
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

export function CoreFeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <SectionHeading
        badge="Built for privacy"
        title="Your infrastructure, your rules"
        subtitle="Everything you need. Nothing you don't."
      />

      <motion.div
        className="grid gap-6 md:grid-cols-3"
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
      >
        {coreFeatures.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            variants={fadeUp}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <Card className="group h-full border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export function PowerFeaturesSection() {
  return (
    <section className="relative overflow-hidden py-4 pb-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          badge="Power features"
          title="Built for how you actually work"
          subtitle="Everything a power user expects — thinking mode, web search, edits, and more."
        />

        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          {powerFeatures.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Card className="group h-full border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:bg-card hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function KeyboardShortcutsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28">
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/50 px-8 py-12"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:gap-12 md:text-left">
          <motion.div
            className="flex-1"
            variants={fadeUp}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          >
            <div className="mb-3 flex justify-center md:justify-start">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Keyboard className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h3 className="mb-2 text-xl font-bold tracking-tight">
              Keyboard-first design
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Every action has a shortcut. Stay in the flow without reaching for
              the mouse.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap justify-center gap-4 md:justify-end"
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
          >
            {shortcuts.map(({ keys, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background px-6 py-4"
              >
                <div className="flex items-center gap-1">
                  {keys.map((key, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border bg-muted px-2 font-mono text-xs font-medium text-foreground shadow-sm">
                        {key}
                      </kbd>
                      {i < keys.length - 1 && (
                        <span className="text-xs text-muted-foreground">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-1/2 h-100 w-100 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute right-0 top-1/2 h-100 w-100 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          badge="How it works"
          title="Up and running in minutes"
        />

        <motion.div
          className="grid gap-8 md:grid-cols-3"
          variants={staggerContainer(0.15)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          {steps.map(({ number, title, description }) => (
            <motion.div
              key={number}
              variants={fadeUp}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex flex-col items-center text-center transition-transform duration-300 hover:scale-[1.03]"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <span className="font-mono text-sm font-bold text-primary">
                  {number}
                </span>
              </div>
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function CTASection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 px-8 py-16 text-center"
        variants={fadeIn}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-75 w-75 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
        </div>

        <motion.div
          className="relative z-10 flex flex-col items-center gap-5"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Your conversations. Your rules.
          </h2>
          <p className="max-w-md text-muted-foreground">
            Join Breeze and experience AI chat the way it should be — fast,
            private, and completely under your control.
          </p>
          {isLoggedIn ? (
            <Link href="/chat">
              <Button size="lg" className="mt-2 gap-2 px-8">
                Go to app <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button size="lg" className="mt-2 gap-2 px-8">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
