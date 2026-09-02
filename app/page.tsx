import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { Fragment } from 'react';

import { WindField } from '@/components/station/wind-field';
import { ToggleTheme } from '@/components/theme-switch';
import { Button } from '@/components/ui/button';
import { authOptions } from '@/lib/auth';

import { GenerativeUISection } from './genui-section';
import {
  BoundarySection,
  CapabilitiesSection,
  CTASection,
  SetupSection,
  ShortcutsSection,
} from './landing-sections';

/** The headline as discrete reveal units. "can touch." stays one unit so the
 *  closing phrase can never be orphaned on its own line. */
const headline: { word: string; accent?: boolean }[] = [
  { word: 'The' },
  { word: 'model' },
  { word: 'runs' },
  { word: 'on' },
  { word: 'a' },
  { word: 'machine' },
  { word: 'you', accent: true },
  { word: 'can\u00A0touch.', accent: true },
];

/** Readings taken from the running system, not marketing numbers.
 *  `localhost:11434` is the default in backend/settings.py. */
const readings = [
  { label: 'Inference', value: 'localhost:11434' },
  { label: 'Transcript', value: 'your MongoDB' },
  { label: 'Egress', value: 'web search only' },
  { label: 'Licence', value: 'MIT' },
];

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`type-wordmark ${className}`}>
      Breeze<span className="text-primary">.</span>
    </span>
  );
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="rule-b bg-background/85 fixed inset-x-0 top-0 z-50 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image alt="" src="/favicon.svg" width={22} height={22} className="size-[22px]" />
            <Wordmark className="text-lg" />
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-foreground eyebrow mr-2 hidden transition-colors sm:inline"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/localhostd3veloper/breeze"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground eyebrow mr-2 hidden transition-colors sm:inline"
            >
              Source
            </Link>
            <ToggleTheme variant="ghost" size="icon-sm" className="rounded-none" />
            {isLoggedIn ? (
              <Button asChild size="sm" className="gap-1.5 rounded-none">
                <Link href="/chat">
                  Open Breeze <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost" className="rounded-none">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="rounded-none">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden pt-14">
        {/* The air the boundary will cut through. */}
        <WindField className="pointer-events-none absolute inset-0 h-full w-full" />
        <div
          aria-hidden
          className="from-background/70 via-background/30 to-background pointer-events-none absolute inset-0 bg-gradient-to-b"
        />

        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-14 sm:px-8 sm:pt-28 sm:pb-20">
          <p className="eyebrow animate-in fade-in fill-mode-both duration-700">
            Station · self-hosted AI chat
          </p>

          <h1 className="type-display mt-6 max-w-4xl text-[clamp(2.6rem,8.5vw,6rem)]">
            {headline.map(({ word, accent }, i) => (
              <Fragment key={`${i}-${word}`}>
                {/* A real space between the masks, not inside one -- whitespace at
                    the end of an inline-block does not create a break opportunity,
                    which would stop the headline wrapping. */}
                {i > 0 && ' '}
                <span className="reveal-mask">
                  <span
                    className={accent ? 'reveal-word text-primary' : 'reveal-word'}
                    style={{ animationDelay: `${120 + i * 55}ms` }}
                  >
                    {word}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>

          <div className="mt-9 grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-20">
            <div>
              <p className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-muted-foreground max-w-xl text-base leading-relaxed duration-700 [animation-delay:260ms] sm:text-lg">
                Breeze is a chat app you host yourself. Your prompts go to a model on your own
                hardware and stay there. Exactly one feature reaches the internet, and only after
                you switch it on.
              </p>

              <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both mt-8 flex flex-wrap items-center gap-3 duration-700 [animation-delay:380ms]">
                {isLoggedIn ? (
                  <Button asChild size="lg" className="gap-2 rounded-none px-7">
                    <Link href="/chat">
                      Open Breeze <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="gap-2 rounded-none px-7">
                      <Link href="/signup">
                        Start chatting <ArrowRight className="size-4" />
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
                  </>
                )}
              </div>
            </div>

            {/* Station readout: four facts, monospaced, read off the running system. */}
            <dl className="animate-in fade-in fill-mode-both border-hairline bg-card/50 divide-hairline w-full divide-y border duration-1000 [animation-delay:520ms] lg:w-72">
              {readings.map(({ label, value }) => (
                <div key={label} className="flex items-baseline justify-between gap-6 px-5 py-3.5">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="readout text-foreground text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <BoundarySection />
      <CapabilitiesSection />
      <GenerativeUISection />
      <SetupSection />
      <ShortcutsSection />
      <CTASection isLoggedIn={isLoggedIn} />

      <footer className="rule-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <Wordmark className="text-foreground text-base" />
            <span className="eyebrow">MIT licensed</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-foreground eyebrow transition-colors">
              Docs
            </Link>
            <Link
              href="https://github.com/localhostd3veloper"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground eyebrow transition-colors"
            >
              @localhostd3veloper
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
