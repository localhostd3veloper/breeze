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
  createdAt: string;
}
