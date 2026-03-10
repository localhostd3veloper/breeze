import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/mongodb';
import ChatMessage from '@/lib/models/chat-message';
import Conversation from '@/lib/models/conversation';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();

  const conversation = await Conversation.findById(id).lean();
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (conversation.user.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await ChatMessage.find({ conversationId: id }).sort({ createdAt: 1 }).lean();

  const history = messages.map((m) => ({ role: m.role, content: m.content }));

  const upstream = await fetch(`${process.env.OLLAMA_API_URL}/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.OLLAMA_API_KEY!,
    },
    body: JSON.stringify({ history }),
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Summarize failed' }, { status: upstream.status });
  }

  const { title } = await upstream.json();
  const trimmedTitle = (title as string)?.trim();
  if (!trimmedTitle) {
    return NextResponse.json({ error: 'Empty title' }, { status: 500 });
  }

  await Conversation.findByIdAndUpdate(id, { title: trimmedTitle });

  return NextResponse.json({ title: trimmedTitle });
}
