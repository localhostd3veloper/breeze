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
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Copy, CopyCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { emptyStateMessages } from '../utils/constants';
import type { ChatMessageDTO } from '@/lib/types/conversation';

interface ChatMessagesProps {
  messages: ChatMessageDTO[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const [greeting] = useState(
    () =>
      emptyStateMessages[Math.floor(Math.random() * emptyStateMessages.length)],
  );

  return (
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl h-full gap-2 px-4 py-6">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <ConversationEmptyState
              title={greeting}
              description="Ask me anything — code, ideas, or whatever's on your mind."
              suppressHydrationWarning
            />
          </div>
        ) : (
          messages.map((msg) => (
            <Fragment key={msg.id}>
              <Message from={msg.role as 'user' | 'assistant'}>
                <MessageContent>
                  {msg.role === 'assistant' ? (
                    msg.isStreaming && msg.content === '' && !msg.reasoning ? (
                      <Shimmer>Thinking…</Shimmer>
                    ) : (
                      <>
                        {msg.reasoning && (
                          <Reasoning isStreaming={msg.isStreaming}>
                            <ReasoningTrigger />
                            <ReasoningContent>{msg.reasoning}</ReasoningContent>
                          </Reasoning>
                        )}
                        <MessageResponse>{msg.content}</MessageResponse>
                      </>
                    )
                  ) : (
                    msg.content
                  )}
                </MessageContent>
              </Message>

              {msg.role === 'assistant' &&
                !msg.isStreaming &&
                msg.content !== '' && (
                  <MessageActions>
                    <MessageAction
                      tooltip="Copy"
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
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
                      navigator.clipboard.writeText(msg.content);
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
