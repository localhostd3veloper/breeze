import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { useStickToBottomContext } from 'use-stick-to-bottom';
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
import { Button } from '@/components/ui/button';
import { Copy, CopyCheck, Pencil, RefreshCw, X, CornerDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { emptyStateMessages } from '../utils/constants';
import type { ChatMessageDTO } from '@/lib/types/conversation';

function ScrollToBottomOnStream({ isAnyStreaming }: { isAnyStreaming: boolean }) {
  const { scrollToBottom } = useStickToBottomContext();
  const wasStreaming = useRef(false);

  useEffect(() => {
    if (isAnyStreaming && !wasStreaming.current) {
      scrollToBottom();
    }
    wasStreaming.current = isAnyStreaming;
  }, [isAnyStreaming, scrollToBottom]);

  return null;
}

interface ChatMessagesProps {
  messages: ChatMessageDTO[];
  isLoading?: boolean;
  onEditMessage?: (messageId: string, newText: string) => Promise<void>;
  onRegenerateMessage?: (messageId: string) => Promise<void>;
}

export function ChatMessages({
  messages,
  isLoading,
  onEditMessage,
  onRegenerateMessage,
}: ChatMessagesProps) {
  const [greeting] = useState(
    () =>
      emptyStateMessages[Math.floor(Math.random() * emptyStateMessages.length)],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEditClick = (msg: ChatMessageDTO) => {
    setEditingId(msg.id);
    setEditText(msg.content);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditSave = async () => {
    if (!editingId || !onEditMessage || !editText.trim()) return;
    setIsSubmittingEdit(true);
    try {
      await onEditMessage(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const isAnyStreaming = messages.some((m) => m.isStreaming);

  return (
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl min-h-full gap-2 px-4 py-6">
        <ScrollToBottomOnStream isAnyStreaming={isAnyStreaming} />
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
              {editingId === msg.id ? (
                <div className="ml-auto flex w-full max-w-[95%] flex-col gap-2">
                  <textarea
                    ref={textareaRef}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                    rows={Math.max(3, editText.split('\n').length)}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEditSave();
                      }
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                    disabled={isSubmittingEdit}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditCancel}
                      disabled={isSubmittingEdit}
                    >
                      <X className="mr-1 size-3.5" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleEditSave}
                      disabled={isSubmittingEdit || !editText.trim()}
                    >
                      <CornerDownLeft className="mr-1 size-3.5" />
                      Send
                    </Button>
                  </div>
                </div>
              ) : (
                <Message from={msg.role as 'user' | 'assistant'}>
                  <MessageContent>
                    {msg.role === 'assistant' ? (
                      msg.isStreaming &&
                      msg.content === '' &&
                      !msg.reasoning ? (
                        <Shimmer>Thinking…</Shimmer>
                      ) : (
                        <>
                          {msg.reasoning && (
                            <Reasoning isStreaming={msg.isStreaming}>
                              <ReasoningTrigger />
                              <ReasoningContent>
                                {msg.reasoning}
                              </ReasoningContent>
                            </Reasoning>
                          )}
                          <MessageResponse>{msg.content}</MessageResponse>
                        </>
                      )
                    ) : (
                      <>
                        {msg.images && msg.images.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {msg.images.map((src, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={src}
                                alt={`attachment ${i + 1}`}
                                className="max-h-48 max-w-xs rounded-md object-contain"
                              />
                            ))}
                          </div>
                        )}
                        {msg.content}
                      </>
                    )}
                  </MessageContent>
                </Message>
              )}

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
                    {onRegenerateMessage && (
                      <MessageAction
                        tooltip="Regenerate"
                        disabled={isAnyStreaming}
                        onClick={() => onRegenerateMessage(msg.id)}
                      >
                        <RefreshCw />
                      </MessageAction>
                    )}
                  </MessageActions>
                )}
              {msg.role === 'user' && editingId !== msg.id && (
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
                  <MessageAction
                    tooltip="Edit"
                    disabled={isAnyStreaming || !onEditMessage}
                    onClick={() => handleEditClick(msg)}
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
