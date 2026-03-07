import { ChatConversationClient } from './page.client';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatConversationClient conversationId={id} />;
}
