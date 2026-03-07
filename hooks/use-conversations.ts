'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { ConversationDTO } from '@/lib/types/conversation';

const QUERY_KEY = ['conversations'] as const;

async function fetchConversations(): Promise<ConversationDTO[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

async function patchConversation(
  id: string,
  patch: Partial<Pick<ConversationDTO, 'isPinned' | 'isArchived'> & { isDeleted: boolean }>,
): Promise<ConversationDTO> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update conversation');
  return res.json();
}

export function useConversations() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchConversations,
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patchConversation(id, { isArchived: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ConversationDTO[]>(QUERY_KEY);
      queryClient.setQueryData<ConversationDTO[]>(QUERY_KEY, (old = []) =>
        old.map((c) => (c.id === id ? { ...c, isArchived: true } : c)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patchConversation(id, { isDeleted: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ConversationDTO[]>(QUERY_KEY);
      queryClient.setQueryData<ConversationDTO[]>(QUERY_KEY, (old = []) =>
        old.filter((c) => c.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function usePinConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      patchConversation(id, { isPinned }),
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ConversationDTO[]>(QUERY_KEY);
      queryClient.setQueryData<ConversationDTO[]>(QUERY_KEY, (old = []) =>
        old.map((c) => (c.id === id ? { ...c, isPinned } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
