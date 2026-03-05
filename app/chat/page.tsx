'use client';

import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import ChatInput from '@/components/Input';
import { ToggleTheme } from '@/components/theme-switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useChatStore } from '@/store/chat';
import { useCallback, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';

const emptyStateMessages = [
  'How can I help?',
  "What's on the agenda?",
  'Ready when you are.',
  'Ask me anything.',
  'What are we building today?',
  "What's on your mind?",
  'How can I assist you?',
  'Let\u2019s get to work.',
];

// module-level: runs once per page load, intentional SSR/client diff handled by suppressHydrationWarning
const greeting =
  emptyStateMessages[Math.floor(Math.random() * emptyStateMessages.length)];

export default function ChatPage() {
  const {
    messages,
    addMessage,
    appendChunk,
    updateMessage,
    isAuthenticated,
    setAuthenticated,
  } = useChatStore();

  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setAuthLoading(false);
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setAuthError('Invalid password.');
    }
  }, [password, setAuthenticated]);

  const { scrollRef, contentRef } = useStickToBottom({ initial: 'smooth' });

  const handleSubmit = useCallback(
    async (text: string, model: string): Promise<void> => {
      const userId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();

      const history = messages.map((m) => ({ role: m.role, content: m.text }));

      addMessage({ id: userId, role: 'user', text });
      addMessage({ id: assistantId, role: 'assistant', text: '' });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, model, history }),
      });

      if (!res.ok || !res.body) {
        updateMessage(assistantId, `Error: ${res.status} ${res.statusText}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendChunk(assistantId, decoder.decode(value, { stream: true }));
      }
    },
    [messages, addMessage, appendChunk, updateMessage],
  );

  return (
    <main className="flex h-screen flex-col">
      <Dialog open={!isAuthenticated}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Enter password</DialogTitle>
            <DialogDescription>
              This platform is password protected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !authLoading && handleAuth()}
              autoFocus
            />
            {authError && (
              <p className="text-sm text-destructive">{authError}</p>
            )}
            <Button onClick={handleAuth} disabled={authLoading}>
              {authLoading ? 'Checking…' : 'Unlock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="logo fixed top-2 left-4 font-satisfy text-xl text-primary underline">
        <Tooltip>
          <TooltipTrigger>Breeze.</TooltipTrigger>
          <TooltipContent align="start">
            Made by @localhostd3veloper
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="fixed top-2 right-4">
        <ToggleTheme />
      </div>
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6"
          ref={contentRef}
        >
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-32 text-center text-muted-foreground select-none">
              <p
                className="text-2xl font-medium text-foreground"
                suppressHydrationWarning
              >
                {greeting}
              </p>
              <p className="text-sm">
                Ask me anything — code, ideas, or whatever&apos;s on your mind.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <Message from={msg.role} key={msg.id}>
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
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <ChatInput onSubmit={handleSubmit} isAuthenticated={isAuthenticated} />
      </div>
    </main>
  );
}
