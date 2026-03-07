import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatHeader } from './components/chat-header';
import { AppSidebar } from '@/components/app-sidebar';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <main className="flex h-dvh min-h-screen w-full">
        <AppSidebar />
        <div className="relative flex-1 h-full flex flex-col">
          <ChatHeader />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
