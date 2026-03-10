import { useQuery } from '@tanstack/react-query';

export interface ConversationSearchResult {
  id: string;
  title: string;
  updatedAt: string;
}

export interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  snippet: string;
  role: string;
}

export interface SearchResults {
  conversations: ConversationSearchResult[];
  messages: MessageSearchResult[];
}

async function fetchSearch(query: string): Promise<SearchResults> {
  const res = await fetch(
    `/api/conversations/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => fetchSearch(query),
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });
}
