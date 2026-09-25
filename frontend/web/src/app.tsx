import { AppRoutes } from '@/router/routes';
import { ChatBot } from '@/features/ai-assistant/components/ChatBot';

export default function App() {
  return (
    <>
      <AppRoutes />
      <ChatBot />
    </>
  );
}