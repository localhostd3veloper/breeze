import type { GenUiMode } from '@/lib/genui/schema';

/**
 * The composer switches a user message was sent with.
 *
 * Persisted on the *user* message, because editing or regenerating has to
 * reproduce the turn as it was actually asked. Reading the live composer instead
 * would silently answer an edited "chart last week's sales" without search or
 * widgets simply because the switches moved since.
 */
export interface MessageModes {
  webSearch: boolean;
  thinking: boolean;
  genui: GenUiMode;
}

export interface IToolCallDTO {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ConversationDTO {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDTO {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'data' | 'tool';
  content: string;
  reasoning?: string;
  images?: string[];
  toolCalls?: IToolCallDTO[];
  toolCallId?: string;
  /** Set on user messages only -- the modes the turn was sent with. */
  modes?: MessageModes;
  createdAt: string;
  // Client-only: present while the assistant message is being streamed
  isStreaming?: boolean;
}
