import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/mongodb';
import Conversation from '@/lib/models/conversation';
import type { ConversationDTO } from '@/lib/types/conversation';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const conversations = await Conversation.find({
    user: session.user.id,
    isDeleted: false,
  })
    .sort({ isPinned: -1, updatedAt: -1 })
    .lean();

  const data: ConversationDTO[] = conversations.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    isPinned: c.isPinned,
    isArchived: c.isArchived,
    createdAt: (c.createdAt as Date).toISOString(),
    updatedAt: (c.updatedAt as Date).toISOString(),
  }));

  return NextResponse.json(data);
}
