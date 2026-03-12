'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchConversations, patchConversation } from '@/lib/services/conversation';
import type { ConversationDTO } from '@/lib/types/conversation';

const QUERY_KEY = ['conversations'] as const;

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
        old.map((c) => (c.id === id ? { ...c, isArchived: true } : c))
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
        old.filter((c) => c.id !== id)
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

export function useRegenerateTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const toastId = toast.loading('Regenerating title...');
      const res = await fetch(`/api/conversations/${id}/summarize`, {
        method: 'POST',
      });
      toast.dismiss(toastId);
      if (!res.ok) throw new Error('Failed to regenerate title');
      const { title } = await res.json();
      return { id, title };
    },
    onSuccess: ({ id, title }) => {
      queryClient.setQueryData<ConversationDTO[]>(QUERY_KEY, (old = []) =>
        old.map((c) => (c.id === id ? { ...c, title } : c))
      );
      toast.success('Title regenerated');
    },
    onError: () => {
      toast.error('Failed to regenerate title');
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
        old.map((c) => (c.id === id ? { ...c, isPinned } : c))
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

export function useGetConversationById(id: string) {
  const { data: conversations, isLoading } = useConversations();

  return {
    conversation: conversations?.find((c) => c.id === id),
    isLoading,
  };
}
