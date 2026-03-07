import { ChatClient } from './page.client';
import { getChatHealth } from './utils/health';

export default async function ChatPage() {
  const isChatAvailable = await getChatHealth();
  return <ChatClient initialHealth={isChatAvailable} />;
}
