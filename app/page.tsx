import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MessageSquare, Brain, Globe, Sparkles } from 'lucide-react';
import Image from 'next/image';
import {
  CoreFeaturesSection,
  PowerFeaturesSection,
  KeyboardShortcutsSection,
  HowItWorksSection,
  CTASection,
} from './landing-sections';

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
            <Link href="https://github.com/localhostd3veloper/breeze" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                Star on GitHub
              </Button>
            </Link>
            {isLoggedIn ? (
              <Link href="/chat">
                <Button size="lg" className="gap-2">
                  Go to app <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" variant="ghost">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center md:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-1/2 top-1/3 h-200 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          <Badge
            variant="secondary"
            className="animate-in fade-in slide-in-from-bottom-3 gap-1.5 px-3 py-1 text-xs duration-700 fill-mode-both"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            Self-hosted · Open source
          </Badge>

          <h1 className="animate-in fade-in slide-in-from-bottom-4 max-w-3xl text-5xl font-bold tracking-tight duration-700 [animation-delay:150ms] fill-mode-both md:text-7xl">
            AI chat that stays{' '}
            <span className="text-primary">on your terms</span>
          </h1>

          <p className="animate-in fade-in slide-in-from-bottom-3 max-w-xl text-lg text-muted-foreground duration-700 [animation-delay:300ms] fill-mode-both">
            Breeze wraps powerful self-hosted language models in a clean, fast
            interface. Private by design — no cloud, no tracking.
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-wrap items-center justify-center gap-3 pt-2 duration-700 [animation-delay:450ms] fill-mode-both">
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
        <div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 mt-16 w-full max-w-2xl duration-700 [animation-delay:600ms] fill-mode-both">
          <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 transition-transform duration-500 hover:scale-[1.02]">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <span className="ml-2 font-satisfy text-sm text-primary">
                Breeze
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="gap-1 px-2 py-0.5 text-xs"
                >
                  <Brain className="h-3 w-3 text-primary" />
                  Thinking
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1 px-2 py-0.5 text-xs"
                >
                  <Globe className="h-3 w-3 text-primary" />
                  Web
                </Badge>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex justify-end">
                <div className="max-w-xs rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  Explain quantum entanglement simply.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-sm rounded-2xl rounded-tl-sm border border-border/60 bg-muted/50 px-4 py-2.5 text-xs italic text-muted-foreground">
                  Thinking... considering analogies for non-physicists...
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

      {/* Animated below-fold sections */}
      <CoreFeaturesSection />
      <PowerFeaturesSection />
      <KeyboardShortcutsSection />
      <HowItWorksSection />
      <CTASection isLoggedIn={isLoggedIn} />

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <span className="font-satisfy text-base text-primary">Breeze</span>
        <span className="mx-2">·</span>
        Private AI for everyone
      </footer>
    </div>
  );
}
