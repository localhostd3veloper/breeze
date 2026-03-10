import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

import { ChatHeader } from './components/chat-header';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <main className="flex h-dvh min-h-screen w-full">
        <AppSidebar />
        <div className="relative flex h-full flex-1 flex-col">
          <ChatHeader />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
