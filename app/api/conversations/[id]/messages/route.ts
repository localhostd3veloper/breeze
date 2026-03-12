import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/mongodb';
import ChatMessage from '@/lib/models/chat-message';
import Conversation from '@/lib/models/conversation';
import type { ChatMessageDTO } from '@/lib/types/conversation';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const data: ChatMessageDTO[] = messages.map((m) => ({
    id: m._id.toString(),
    role: m.role,
    content: m.content,
    ...(m.reasoning && { reasoning: m.reasoning }),
    ...(m.images?.length && { images: m.images }),
    ...(m.toolCalls?.length && { toolCalls: m.toolCalls }),
    ...(m.toolCallId && { toolCallId: m.toolCallId }),
    createdAt: (m.createdAt as Date).toISOString(),
  }));

  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { role, content, reasoning, images, toolCalls, toolCallId } = await req.json();

  const message = await ChatMessage.create({
    conversationId: id,
    role,
    content,
    ...(reasoning && { reasoning }),
    ...(images?.length && { images }),
    ...(toolCalls?.length && { toolCalls }),
    ...(toolCallId && { toolCallId }),
  });

  await Conversation.findByIdAndUpdate(id, { updatedAt: new Date() });

  const data: ChatMessageDTO = {
    id: message._id.toString(),
    role: message.role,
    content: message.content,
    ...(message.reasoning && { reasoning: message.reasoning }),
    createdAt: (message.createdAt as Date).toISOString(),
  };

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const fromId = new URL(req.url).searchParams.get('fromId');
  if (!fromId) return NextResponse.json({ error: 'fromId required' }, { status: 400 });

  let fromObjectId: Types.ObjectId;
  try {
    fromObjectId = new Types.ObjectId(fromId);
  } catch {
    return NextResponse.json({ error: 'Invalid fromId' }, { status: 400 });
  }

  await dbConnect();

  const conversation = await Conversation.findById(id).lean();
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (conversation.user.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ChatMessage.deleteMany({
    conversationId: id,
    _id: { $gte: fromObjectId },
  });

  return NextResponse.json({ ok: true });
}
