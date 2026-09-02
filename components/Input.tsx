'use client';

import {
  ChartColumnIcon,
  GlobeIcon,
  ImageIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { memo, useCallback, useEffect, useState } from 'react';

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputButton,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputRow,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  useProviderAttachments,
} from '@/components/ai-elements/prompt-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import type { GenUiMode } from '@/lib/genui/schema';
import type { ComposerMode } from '@/store/chat';
import { useChatStore } from '@/store/chat';

/**
 * Every mode owns one Station accent, and the composer's border wears the accent
 * of whichever mode was switched on last. Turning something on is then visible on
 * the input itself, not only inside the popover you just closed -- and the icon in
 * the popover carries the same colour, so the mapping is learnable.
 */
const MODE_ACCENT: Record<ComposerMode, string> = {
  thinking: 'var(--primary)',
  web: 'var(--series-3)',
  visual: 'var(--brass)',
  images: 'var(--series-5)',
};

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
  const handleRemove = useCallback(() => onRemove(attachment.id), [onRemove, attachment.id]);
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

  const handleRemove = useCallback((id: string) => attachments.remove(id), [attachments]);

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <PromptInputHeader>
      <Attachments className="p-0" variant="grid">
        {attachments.files.map((attachment) => (
          <AttachmentItem attachment={attachment} key={attachment.id} onRemove={handleRemove} />
        ))}
      </Attachments>
    </PromptInputHeader>
  );
};

interface ChatInputProps {
  onSubmit?: (
    text: string,
    webSearch: boolean,
    thinking: boolean,
    images: string[],
    genui: GenUiMode
  ) => Promise<void>;
  isChatAvailable: boolean;
}

const Composer = ({ onSubmit, isChatAvailable }: ChatInputProps) => {
  const attachments = useProviderAttachments();
  const hasImages = attachments.files.length > 0;

  /**
   * The switches live in the store, not here: sending the first message navigates
   * `/chat` -> `/chat/[id]`, which unmounts this composer. Local state meant every
   * mode the user had just set was silently off again on their second message.
   */
  const modes = useChatStore((s) => s.modes);
  const setMode = useChatStore((s) => s.setMode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<'submitted' | 'streaming' | 'ready' | 'error'>('ready');

  // Persisted modes are read after mount rather than at store creation, so the
  // client's first render matches the server's. See `skipHydration` in the store.
  useEffect(() => {
    void useChatStore.persist.rehydrate();
  }, []);

  /**
   * Attaching an image is a mode change too, and the border should show it -- but
   * it is derived from the attachment tray rather than switched, so it is tracked
   * here instead of in the store. Adjusting during render on the edge (rather than
   * in an effect) means the border never commits a frame wearing a stale accent,
   * and keeps the store write out of the render pass.
   */
  const [imagesAreNewest, setImagesAreNewest] = useState(false);
  const [prevHasImages, setPrevHasImages] = useState(false);
  if (prevHasImages !== hasImages) {
    setPrevHasImages(hasImages);
    setImagesAreNewest(hasImages);
  }

  const thinking = modes.includes('thinking');
  const webSearch = modes.includes('web');
  /**
   * Off is `auto`, not `off`: the backend router still decides per turn, which is
   * the behaviour that makes the feature feel automatic. The switch only removes
   * the router's veto. Turning it on costs a call to the larger UI model on every
   * turn, so it is not the default.
   */
  const alwaysVisual = modes.includes('visual');

  const newestMode = imagesAreNewest && hasImages ? 'images' : modes.at(-1);
  const accent = newestMode ? MODE_ACCENT[newestMode] : 'var(--input)';
  const glow = newestMode ? `color-mix(in oklab, ${accent} 16%, transparent)` : 'transparent';

  const handleToggle = useCallback(
    (mode: ComposerMode) => (on: boolean) => {
      // Whatever was just switched owns the accent, so images stop being newest.
      setImagesAreNewest(false);
      setMode(mode, on);
    },
    [setMode]
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text?.trim();
      if (!text) return;

      if (onSubmit) {
        setStatus('streaming');
        const images = message.files.map((f) => f.url);
        // return immediately so PromptInput clears the textarea now
        onSubmit(text, webSearch, thinking, images, alwaysVisual ? 'on' : 'auto').finally(() =>
          setStatus('ready')
        );
      }
    },
    [onSubmit, webSearch, thinking, alwaysVisual]
  );

  return (
    <PromptInput
      accept="image/*"
      globalDrop
      multiple
      onSubmit={handleSubmit}
      shellClassName="rounded-[1.5rem] border-[var(--composer-accent)] shadow-[0_0_0_3px_var(--composer-glow)]"
      style={{ '--composer-accent': accent, '--composer-glow': glow } as CSSProperties}
    >
      <PromptInputAttachmentsDisplay />
      <PromptInputRow>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger className="rounded-full" />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <Popover onOpenChange={setSettingsOpen} open={settingsOpen}>
            <PopoverTrigger asChild>
              <PromptInputButton
                className="rounded-full"
                style={newestMode ? { color: accent } : undefined}
                tooltip="Chat settings"
              >
                <SlidersHorizontalIcon size={16} />
              </PromptInputButton>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 space-y-3 p-3" side="top">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <SparklesIcon
                    size={14}
                    style={thinking ? { color: MODE_ACCENT.thinking } : undefined}
                  />
                  <span>Thinking</span>
                </div>
                <Switch checked={thinking} onCheckedChange={handleToggle('thinking')} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <GlobeIcon size={14} style={webSearch ? { color: MODE_ACCENT.web } : undefined} />
                  <span>Web search</span>
                </div>
                <Switch checked={webSearch} onCheckedChange={handleToggle('web')} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <ChartColumnIcon
                    size={14}
                    style={alwaysVisual ? { color: MODE_ACCENT.visual } : undefined}
                  />
                  <span>Always visualize</span>
                </div>
                <Switch checked={alwaysVisual} onCheckedChange={handleToggle('visual')} />
              </div>
              <p className="text-muted-foreground text-xs">
                Leave this off and Breeze decides when a chart or table helps. Web search and
                visuals now work in the same answer.
              </p>
              {hasImages && (
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <ImageIcon size={14} style={{ color: MODE_ACCENT.images }} />
                  {attachments.files.length} image{attachments.files.length > 1 ? 's' : ''} attached
                </p>
              )}
            </PopoverContent>
          </Popover>
        </PromptInputTools>
        <PromptInputTextarea
          disabled={!isChatAvailable}
          placeholder={
            isChatAvailable ? 'Ask anything' : 'Breeze is offline -- messages will not send'
          }
        />
        <PromptInputSubmit status={status} />
      </PromptInputRow>
    </PromptInput>
  );
};

const ChatInput = (props: ChatInputProps) => (
  <PromptInputProvider>
    <Composer {...props} />
  </PromptInputProvider>
);

export default ChatInput;
