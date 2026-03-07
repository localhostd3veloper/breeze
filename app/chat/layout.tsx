import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ChatHeader } from './components/chat-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Palmtree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <main className="flex h-dvh min-h-screen w-full">
        <AppSidebar>
          <SidebarHeader className="flex-row items-center justify-between gap-2">
            <Palmtree className="size-6 text-primary stroke-[1.5]" />
            <SidebarTrigger />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup></SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="flex-row items-center gap-2">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage
                  src="https://github.com/localhostd3veloper.png"
                  alt="@localhostd3veloper"
                />
                <AvatarFallback>GA</AvatarFallback>
              </Avatar>
              <p className="text-sm">Gautam Anand</p>
              <Badge variant="outline">Pro</Badge>
            </div>
            <Button size="icon" variant="ghost">
              <LogOut />
            </Button>
          </SidebarFooter>
        </AppSidebar>
        <div className="relative flex-1 h-full flex flex-col">
          <ChatHeader />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
