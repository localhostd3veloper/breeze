'use client';

import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { GlobeIcon, SlidersHorizontalIcon, SparklesIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

interface AttachmentItemProps {
  attachment: {
    id: string;
    type: 'file';
    filename?: string;
    mediaType: string;
    url: string;
  };
  onRemove: (id: string) => void;
}

const AttachmentItem = memo(({ attachment, onRemove }: AttachmentItemProps) => {
  const handleRemove = useCallback(
    () => onRemove(attachment.id),
    [onRemove, attachment.id],
  );
  return (
    <Attachment data={attachment} key={attachment.id} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  );
});

AttachmentItem.displayName = 'AttachmentItem';

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  const handleRemove = useCallback(
    (id: string) => attachments.remove(id),
    [attachments],
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="grid">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
};

interface ChatInputProps {
  onSubmit?: (
    text: string,
    webSearch: boolean,
    thinking: boolean,
    images: string[],
  ) => Promise<void>;
  isChatAvailable: boolean;
}

const ChatInput = ({ onSubmit, isChatAvailable }: ChatInputProps) => {
  const [webSearch, setWebSearch] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready');

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text?.trim();
      if (!text) return;

      if (onSubmit) {
        setStatus('streaming');
        const images = message.files.map((f) => f.url);
        // return immediately so PromptInput clears the textarea now
        onSubmit(text, webSearch, thinking, images).finally(() =>
          setStatus('ready'),
        );
      }
    },
    [onSubmit, webSearch, thinking],
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="size-full">
        <PromptInputProvider>
          <PromptInput
            accept="image/*"
            globalDrop
            multiple
            onSubmit={handleSubmit}
          >
            <PromptInputAttachmentsDisplay />
            <PromptInputBody>
              <PromptInputTextarea
                disabled={!isChatAvailable}
                placeholder={
                  !isChatAvailable
                    ? 'Shhh, the AI is sleeping...'
                    : 'Type a message...'
                }
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <Popover onOpenChange={setSettingsOpen} open={settingsOpen}>
                  <PopoverTrigger asChild>
                    <PromptInputButton
                      tooltip="Chat settings"
                      className={
                        webSearch || thinking
                          ? 'bg-primary/10 text-accent-foreground'
                          : ''
                      }
                    >
                      <SlidersHorizontalIcon size={16} />
                    </PromptInputButton>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-52 p-3 space-y-3"
                    side="top"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <SparklesIcon size={14} />
                        <span>Thinking</span>
                      </div>
                      <Switch
                        checked={thinking}
                        onCheckedChange={setThinking}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <GlobeIcon size={14} />
                        <span>Web Search</span>
                      </div>
                      <Switch
                        checked={webSearch}
                        onCheckedChange={setWebSearch}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </PromptInputTools>
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
      <p className="text-center text-xs text-muted-foreground/80">
        Breeze can make mistakes. Verify important information.
      </p>
    </div>
  );
};

export default ChatInput;
