import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { ChatConversationClient } from './page.client';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';

  try {
    const res = await fetch(`${protocol}://${host}/api/conversations/${id}`, {
      headers: { cookie: hdrs.get('cookie') ?? '' },
    });
    if (!res.ok) return { title: 'Breeze' };
    const { title } = await res.json();
    return { title };
  } catch {
    return { title: 'Breeze' };
  }
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  return <ChatConversationClient conversationId={id} />;
}
