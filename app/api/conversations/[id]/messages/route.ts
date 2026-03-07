import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/mongodb';
import Conversation from '@/lib/models/conversation';
import ChatMessage from '@/lib/models/chat-message';
import type { ChatMessageDTO } from '@/lib/types/conversation';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const messages = await ChatMessage.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .lean();

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
