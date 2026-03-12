import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/mongodb';
import ChatMessage from '@/lib/models/chat-message';
import Conversation from '@/lib/models/conversation';

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract up to 160 chars of context centered on the first match of `anchorRegex`. */
function extractSnippet(content: string, anchorRegex: RegExp): string {
  const match = anchorRegex.exec(content);
  if (!match) return content.slice(0, 160);
  const ctx = 70;
  const start = Math.max(0, match.index - ctx);
  const end = Math.min(content.length, match.index + match[0].length + ctx);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return NextResponse.json({ conversations: [], messages: [] });
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const terms = q.split(/\s+/).filter(Boolean).map(escapeRegex);
  const termRegexes = terms.map((t) => new RegExp(t, 'i'));
  const anchorRegex = termRegexes[0]; // used for snippet centering

  const titleFilter =
    terms.length === 1
      ? { title: termRegexes[0] }
      : { $and: termRegexes.map((r) => ({ title: r })) };

  const contentFilter =
    terms.length === 1
      ? { content: termRegexes[0] }
      : { $and: termRegexes.map((r) => ({ content: r })) };

  const [conversations, messages] = await Promise.all([
    Conversation.find({ user: userId, isDeleted: false, ...titleFilter })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),

    ChatMessage.aggregate([
      { $match: { ...contentFilter, role: { $in: ['user', 'assistant'] } } },
      {
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conv',
        },
      },
      { $unwind: '$conv' },
      { $match: { 'conv.user': userId, 'conv.isDeleted': false } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $project: {
          conversationId: 1,
          content: 1,
          role: 1,
          convTitle: '$conv.title',
        },
      },
    ]),
  ]);

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      updatedAt: (c.updatedAt as Date).toISOString(),
    })),
    messages: messages.map((m) => ({
      messageId: m._id.toString(),
      conversationId: m.conversationId.toString(),
      conversationTitle: m.convTitle as string,
      snippet: extractSnippet(m.content as string, anchorRegex),
      role: m.role as string,
    })),
  });
}
