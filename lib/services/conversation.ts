import { ConversationDTO } from '../types/conversation';

export async function fetchConversations(): Promise<ConversationDTO[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function patchConversation(
  id: string,
  patch: Partial<Pick<ConversationDTO, 'isPinned' | 'isArchived'> & { isDeleted: boolean }>
): Promise<ConversationDTO> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update conversation');
  return res.json();
}
