import { Fragment, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Copy, CopyCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { emptyStateMessages } from '../utils/constants';

interface ChatMessagesProps {
  messages: Array<{
    id: string;
    role: string;
    text: string;
  }>;
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const [greeting] = useState(
    () =>
      emptyStateMessages[Math.floor(Math.random() * emptyStateMessages.length)],
  );

  return (
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-2 px-4 py-6">
        {messages.length === 0 ? (
          <ConversationEmptyState
            title={greeting}
            description="Ask me anything — code, ideas, or whatever's on your mind."
            suppressHydrationWarning
          />
        ) : (
          messages.map((msg) => (
            <Fragment key={msg.id}>
              <Message from={msg.role as 'user' | 'assistant'}>
                <MessageContent>
                  {msg.role === 'assistant' ? (
                    msg.text === '' ? (
                      <Shimmer>Thinking…</Shimmer>
                    ) : (
                      <MessageResponse>{msg.text}</MessageResponse>
                    )
                  ) : (
                    msg.text
                  )}
                </MessageContent>
              </Message>

              {msg.role === 'assistant' && msg.text !== '' && (
                <MessageActions>
                  <MessageAction
                    tooltip="Copy"
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      toast.success('Copied to clipboard', {
                        icon: <CopyCheck className="h-4 w-4" />,
                      });
                    }}
                  >
                    <Copy />
                  </MessageAction>
                </MessageActions>
              )}
              {msg.role === 'user' && (
                <MessageActions className="justify-end">
                  <MessageAction
                    tooltip="Copy"
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      toast.success('Copied to clipboard', {
                        icon: <CopyCheck className="h-4 w-4" />,
                      });
                    }}
                  >
                    <Copy />
                  </MessageAction>
                  {/* Edit */}
                  <MessageAction
                    tooltip="Edit"
                    disabled
                    onClick={() => {
                      //TODO: implement edit functionality
                    }}
                  >
                    <Pencil />
                  </MessageAction>
                </MessageActions>
              )}
            </Fragment>
          ))
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
