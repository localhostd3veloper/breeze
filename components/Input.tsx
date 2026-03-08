'use client';

import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
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
import { CheckIcon, GlobeIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

const models = [
  {
    chef: 'Qwen',
    chefSlug: 'ollama',
    id: 'qwen3.5:9b',
    name: 'Qwen3.5 9B (Reasoning)',
    providers: ['ollama', 'huggingface'],
  },
  {
    chef: 'Qwen',
    chefSlug: 'ollama',
    id: 'qooba/qwen3-coder-30b-a3b-instruct:q3_k_m',
    name: 'Qwen3 Coder 30B',
    providers: ['ollama'],
  },
  {
    chef: 'Qwen',
    chefSlug: 'ollama',
    id: 'hf.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF:Q4_K_M',
    name: 'Qwen2.5 Coder 3B',
    providers: ['ollama'],
  },
  {
    chef: 'Meta',
    chefSlug: 'ollama',
    id: 'llama3',
    name: 'Llama 3',
    providers: ['ollama'],
  },
  {
    chef: 'Mistral',
    chefSlug: 'ollama',
    id: 'mistral',
    name: 'Mistral',
    providers: ['ollama'],
  },
  {
    chef: 'Meta',
    chefSlug: 'ollama',
    id: 'codellama',
    name: 'Code Llama',
    providers: ['ollama'],
  },
];

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

interface ModelItemProps {
  m: (typeof models)[0];
  selectedModel: string;
  onSelect: (id: string) => void;
}

const ModelItem = memo(({ m, selectedModel, onSelect }: ModelItemProps) => {
  const handleSelect = useCallback(() => onSelect(m.id), [onSelect, m.id]);
  return (
    <ModelSelectorItem key={m.id} onSelect={handleSelect} value={m.id}>
      <ModelSelectorLogo provider={m.chefSlug} />
      <ModelSelectorName>{m.name}</ModelSelectorName>
      <ModelSelectorLogoGroup>
        {m.providers.map((provider) => (
          <ModelSelectorLogo key={provider} provider={provider} />
        ))}
      </ModelSelectorLogoGroup>
      {selectedModel === m.id ? (
        <CheckIcon className="ml-auto size-4" />
      ) : (
        <div className="ml-auto size-4" />
      )}
    </ModelSelectorItem>
  );
});

ModelItem.displayName = 'ModelItem';

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
    model: string,
    webSearch: boolean,
    images: string[],
  ) => Promise<void>;
  isChatAvailable: boolean;
}

const ChatInput = ({ onSubmit, isChatAvailable }: ChatInputProps) => {
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready');

  const selectedModelData = models.find((m) => m.id === model);

  const handleModelSelect = useCallback((id: string) => {
    setModel(id);
    setModelSelectorOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text?.trim();
      if (!text) return;

      if (onSubmit) {
        setStatus('streaming');
        const images = message.files.map((f) => f.url);
        // return immediately so PromptInput clears the textarea now
        onSubmit(text, model, webSearch, images).finally(() =>
          setStatus('ready'),
        );
      }
    },
    [onSubmit, model, webSearch],
  );

  return (
    <div className="size-ful hover:shadow-md transition-shadow duration-200">
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
              <PromptInputButton
                tooltip="Search the web"
                className={
                  webSearch ? 'bg-primary/10 text-accent-foreground' : ''
                }
                onClick={() => setWebSearch((v) => !v)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <ModelSelector
                onOpenChange={setModelSelectorOpen}
                open={modelSelectorOpen}
              >
                <ModelSelectorTrigger asChild>
                  <PromptInputButton>
                    {selectedModelData?.chefSlug && (
                      <ModelSelectorLogo
                        provider={selectedModelData.chefSlug}
                      />
                    )}
                    {selectedModelData?.name && (
                      <ModelSelectorName>
                        {selectedModelData.name}
                      </ModelSelectorName>
                    )}
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    {['Qwen', 'Meta', 'Mistral'].map((chef) => (
                      <ModelSelectorGroup heading={chef} key={chef}>
                        {models
                          .filter((m) => m.chef === chef)
                          .map((m) => (
                            <ModelItem
                              key={m.id}
                              m={m}
                              onSelect={handleModelSelect}
                              selectedModel={model}
                            />
                          ))}
                      </ModelSelectorGroup>
                    ))}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
};

export default ChatInput;
