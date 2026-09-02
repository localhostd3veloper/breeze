import { cookies } from 'next/headers';
import { ReactNode } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

import { ChatComposer } from './components/chat-composer';
import { ChatHeader } from './components/chat-header';

export default async function ChatLayout({ children }: { children: ReactNode }) {
  // SidebarProvider writes this cookie on every toggle but nothing was reading
  // it, so a stowed sidebar came back pinned open on the next load. Read here
  // and the first paint is already the state the user left it in -- no flash of
  // the wrong layout, which matters more now that stowing is the point.
  const stored = (await cookies()).get('sidebar_state')?.value;

  return (
    <SidebarProvider defaultOpen={stored !== 'false'}>
      <main className="flex h-dvh min-h-screen w-full">
        <AppSidebar />
        <div className="relative flex h-full flex-1 flex-col">
          <ChatHeader />
          {children}
          <ChatComposer />
        </div>
      </main>
    </SidebarProvider>
  );
}
