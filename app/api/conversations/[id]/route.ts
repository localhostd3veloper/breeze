import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/mongodb';
import Conversation from '@/lib/models/conversation';
import type { ConversationDTO } from '@/lib/types/conversation';

const patchSchema = z
  .object({
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    title: z.string().min(1).max(200).optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await dbConnect();

  const conversation = await Conversation.findById(id).lean();
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (conversation.user.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await Conversation.findByIdAndUpdate(id, parsed.data, {
    new: true,
  }).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data: ConversationDTO = {
    id: updated._id.toString(),
    title: updated.title,
    isPinned: updated.isPinned,
    isArchived: updated.isArchived,
    createdAt: (updated.createdAt as Date).toISOString(),
    updatedAt: (updated.updatedAt as Date).toISOString(),
  };

  return NextResponse.json(data);
}
