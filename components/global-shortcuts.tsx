'use client';

import { useRouter } from 'next/navigation';

import { useCtrlShortcut } from '@/hooks/use-ctrl-shortcuts';

export function GlobalShortcuts() {
  const router = useRouter();

  useCtrlShortcut('o', () => router.push('/chat'), { shift: true });

  return null; // This is a logic-only component
}
