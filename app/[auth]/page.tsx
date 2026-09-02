import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { SignupForm } from '@/components/signup-form';
import { WindField } from '@/components/station/wind-field';
import { ToggleTheme } from '@/components/theme-switch';

export default async function AuthPage({ params }: { params: Promise<{ auth: string }> }) {
  const { auth } = await params;

  if (auth !== 'login' && auth !== 'signup') {
    notFound();
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="type-wordmark flex items-center gap-2">
            <Image
              src="/favicon.svg"
              alt="Breeze Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-2xl">
              Breeze<span className="text-primary">.</span>
            </span>
          </Link>
          <ToggleTheme variant="ghost" size="icon-sm" className="rounded-none" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{auth === 'login' ? <LoginForm /> : <SignupForm />}</div>
        </div>
      </div>
      {/* The same air, and the same boundary, as the landing page. */}
      <div className="bg-card/40 rule-l relative hidden overflow-hidden lg:block">
        <WindField className="pointer-events-none absolute inset-0 h-full w-full" />
        <div
          aria-hidden
          className="from-card/10 to-card pointer-events-none absolute inset-0 bg-gradient-to-b"
        />
        <div className="relative flex h-full flex-col justify-end gap-6 p-12">
          <p className="eyebrow">Station · self-hosted</p>
          <p className="type-display max-w-sm text-3xl">
            Your transcripts stay on the machine you put them on.
          </p>
          <dl className="rule-t flex flex-wrap gap-x-10 gap-y-4 pt-6">
            <div>
              <dt className="eyebrow">Inference</dt>
              <dd className="readout mt-1.5 text-sm">localhost:11434</dd>
            </div>
            <div>
              <dt className="eyebrow">Accounts</dt>
              <dd className="readout mt-1.5 text-sm">your MongoDB</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
