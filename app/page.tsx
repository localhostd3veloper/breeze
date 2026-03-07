import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  Lock,
  Zap,
  MessageSquare,
  Server,
  Shield,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';

const features = [
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

export default async function Page() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image
                alt="Breeze"
                src="/favicon.svg"
                width={28}
                height={28}
                className="size-8"
              />
            </Link>
            <span className="font-satisfy text-xl text-primary">Breeze</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/chat">
                <Button className="gap-2">
                  Go to app <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-14 text-center">
        {/* Background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-1/2 top-1/3 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3 text-primary" />
            Self-hosted · Open source
          </Badge>

          <h1 className="max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
            AI chat that stays{' '}
            <span className="text-primary">on your terms</span>
          </h1>

          <p className="max-w-xl text-lg text-muted-foreground">
            Breeze wraps powerful self-hosted language models in a clean, fast
            interface. Private by design — no cloud, no tracking.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {isLoggedIn ? (
              <Link href="/chat">
                <Button size="lg" className="gap-2 px-6">
                  Go to app <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg" className="gap-2 px-6">
                    Start chatting <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="px-6">
                    Sign in
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Floating chat preview */}
        <div className="relative z-10 mt-16 w-full max-w-2xl">
          <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/10">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <span className="ml-2 font-satisfy text-sm text-primary">
                Breeze
              </span>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex justify-end">
                <div className="max-w-xs rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  Explain quantum entanglement simply.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-sm rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  Quantum entanglement is when two particles become linked —
                  measuring one instantly tells you about the other, no matter
                  the distance.
                  <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-primary align-middle" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <div className="mb-14 text-center">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Built for people who care about privacy
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need. Nothing you don&apos;t.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="group border-border/60 bg-card transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
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
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-1/2 h-100 w-100 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute right-0 top-1/2 h-100 w-100 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <Badge variant="secondary" className="mb-4">
              How it works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(({ number, title, description }) => (
              <div
                key={number}
                className="flex flex-col items-center text-center"
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 px-8 py-16 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-75 w-75 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-5">
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
            <Link href="/signup">
              <Button size="lg" className="mt-2 gap-2 px-8">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <span className="font-satisfy text-base text-primary">Breeze</span>
        <span className="mx-2">·</span>
        Private AI for everyone
      </footer>
    </div>
  );
}
